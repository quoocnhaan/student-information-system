"""Unicode literal semantics, supported applicability and embedding transport."""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from pydantic import ValidationError

from app.api.v1.schemas.retrieval import StudentContext
from app.application.document_metadata import DocumentMetadataDetector
from app.application.retrieval import literal_occurrences
from app.config import Settings
from app.domain.document import OcrPage, ProgramScope
from app.infrastructure.embeddings import embed_texts, validate_vector
from app.worker.index import ReembedChunkHandler


@pytest.mark.parametrize("text,query,sensitive,expected", [
    ("😀 Điều 1. Điều 1.", "điều 1.", False, [{"start": 2, "end": 9}, {"start": 10, "end": 17}]),
    ("Straße STRASSE", "strasse", False, [{"start": 0, "end": 6}, {"start": 7, "end": 14}]),
    ("ß", "s", False, []),
    ("aaaa", "aa", True, [{"start": 0, "end": 2}, {"start": 1, "end": 3}, {"start": 2, "end": 4}]),
    ("[a.*] [A.*]", "[a.*]", True, [{"start": 0, "end": 5}]),
    ("tiếng Việt", "tieng", False, []),
    ("a  b", "a b", False, []),
])
def test_original_code_point_offsets(text, query, sensitive, expected):
    assert literal_occurrences(text, query, sensitive) == expected


@pytest.mark.parametrize("scope", [
    {"type": "language_major"}, {"type": "specific_programs", "programs": []},
    {"type": "specific_programs", "programs": ["non_language"]},
    {"type": "specific_programs", "programs": ["computer_science"]},
    {"type": "all", "programs": ["english"]},
])
def test_rejects_unsupported_applicability(scope):
    with pytest.raises(ValidationError):
        ProgramScope.model_validate(scope)


def test_normalizes_and_deduplicates_major_keys():
    assert ProgramScope(type="specific_programs", programs=[" English ", "english", "CHINESE"]).programs == ["english", "chinese"]
    assert StudentContext(cohort=2023, major=" Chinese ").major == "chinese"


@pytest.mark.parametrize("context", [{"cohort": 2023}, {"major": "english"},
    {"cohort": 2023, "major": "other"}, {"cohort": 1899, "major": "english"},
    {"cohort": "2023", "major": "english"}])
def test_context_requires_supported_major_and_integer_year(context):
    with pytest.raises(ValidationError):
        StudentContext.model_validate(context)


@pytest.mark.parametrize("heading,expected", [
    ("Áp dụng cho ngành Ngôn ngữ Anh", {"type": "specific_programs", "programs": ["english"]}),
    ("Áp dụng cho ngành Ngôn ngữ Trung Quốc", {"type": "specific_programs", "programs": ["chinese"]}),
    ("Áp dụng cho các ngành không chuyên ngữ. Yêu cầu tiếng Anh", {"type": "non_language_major", "programs": []}),
    ("Quy định đào tạo\nĐiều 1. Yêu cầu tiếng Anh cho ngành Ngôn ngữ Anh", None),
    ("Quy định cho các ngành ngôn ngữ", None),
])
def test_heading_only_specific_scope_detection(heading, expected):
    detected = DocumentMetadataDetector().detect([OcrPage(page=1, raw_text=heading)], "test.pdf")
    assert detected.get("program_scope") == expected


@pytest.mark.parametrize("bad", [[0.0] * 768, [float("nan")] * 768, [float("inf")] * 768, [True] * 768, ["0.1"] * 768])
def test_rejects_invalid_vectors(bad):
    with pytest.raises(ValueError):
        validate_vector(bad)


def test_embedding_prefixes_order_and_duplicate_indexes():
    async def run():
        captured = []
        def respond(request):
            captured.append(json.loads(request.content))
            return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.1] * 768}]})
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            settings = Settings(_env_file=None)
            await embed_texts(["passage"], settings, client)
            await embed_texts(["question"], settings, client, purpose="query")
        assert captured[0]["input"] == ["search_document: passage"]
        assert captured[1]["input"] == ["search_query: question"]
        def duplicate(request):
            return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.1] * 768}] * 2})
        async with httpx.AsyncClient(transport=httpx.MockTransport(duplicate)) as client:
            with pytest.raises(ValueError, match="indexes"):
                await embed_texts(["a", "b"], settings, client)
    asyncio.run(run())


def test_reembedding_cannot_mix_models_or_task_profiles():
    async def run():
        settings = Settings(_env_file=None)
        database = AsyncMock()
        database.get_document.return_value = {"embedding_model": settings.lmstudio_embedding_model, "embedding_profile": None}
        claimed = {"document_id": "document:doc_" + "a" * 32,
                   "payload": {"embedding_text": "passage", "embedding_version": 1}}
        handler = ReembedChunkHandler(settings, database)
        with patch("app.worker.index.embed_texts", new=AsyncMock()) as embed:
            with pytest.raises(ValueError, match="re-index"):
                await handler.process("job:id", "attempt", claimed)
            embed.assert_not_awaited()
    asyncio.run(run())
