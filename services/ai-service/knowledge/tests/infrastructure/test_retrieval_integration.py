"""Run against an isolated SurrealDB 3.2.4 instance, never the application DB."""

import asyncio
import os
from pathlib import Path
from uuid import uuid4

import pytest
from surrealdb import RecordID

from app.api.v1.schemas.retrieval import ExactRequest, LookupRequest, SearchRequest
from app.config import Settings
from app.infrastructure.embeddings import embedding_profile
from app.infrastructure.retrieval import RetrievalDatabase
from app.infrastructure.surreal import SurrealDatabase


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated test SurrealDB configured")
def test_all_retrieval_modes_and_live_applicability():
    async def run():
        settings = Settings(SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
                            SURREAL_USER="root", SURREAL_PASSWORD="root",
                            SURREAL_NAMESPACE="retrieval_test", SURREAL_DATABASE="test_" + uuid4().hex,
                            _env_file=None)
        database = SurrealDatabase(settings)
        await database.connect()
        try:
            await database.execute_script((Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8"))
            adapter = RetrievalDatabase(database)
            model = settings.lmstudio_embedding_model
            docs, chunks = {}, {}
            vector = [1.0] + [0.0] * 767

            async def seed(name, scope, cohort=None, status="active", process="indexed", model_override=None, profile=True):
                document_id = RecordID("document", "doc_" + uuid4().hex)
                docs[name] = str(document_id)
                content = {"title": name, "document_number": "QD/2021-01", "cohort": cohort,
                           "program_scope": scope, "status": status, "process_status": process,
                           "embedding_model": model_override or model,
                           "source": {"object_key": uuid4().hex, "original_filename": "source.pdf", "mime_type": "application/pdf"}}
                if profile:
                    content["embedding_profile"] = embedding_profile(model)
                await database.client.create(document_id, content)
                chunk_id = RecordID("chunk", "chunk_" + uuid4().hex)
                chunks[name] = str(chunk_id)
                # Excluded candidates rank higher than the Chinese candidate.
                embedding = [0.8, 0.6] + [0.0] * 766 if name == "chinese" else vector
                await database.client.create(chunk_id, {"document_id": document_id, "text": "😀 Điều 1. Straße [a.*] Điều 1.",
                    "embedding_text": "passage", "embedding": embedding, "token_count": 10,
                    "position": {"chunk_index": 0, "page_start": 1, "page_end": 2},
                    "hierarchy": {"article_no": 1, "clause_no": 2}})

            all_scope = {"type": "all", "programs": []}
            await seed("all", all_scope, {"from_year": 2023, "to_year": 2025})
            await seed("chinese", {"type": "specific_programs", "programs": ["chinese"]}, {"from_year": 2023})
            await seed("english", {"type": "specific_programs", "programs": ["english"]})
            await seed("non_language", {"type": "non_language_major", "programs": []})
            await seed("unknown", None)
            await seed("inactive", all_scope, status="inactive")
            await seed("unindexed", all_scope, process="review")
            await seed("old_cohort", all_scope, {"from_year": 2020, "to_year": 2022})
            await seed("wrong_model", all_scope, model_override="different-model")
            await seed("old_profile", all_scope, profile=False)

            for major, cohort, names in [
                ("chinese", 2023, {"all", "chinese", "wrong_model", "old_profile"}),
                ("english", 2023, {"all", "english", "wrong_model", "old_profile"}),
                ("non_language", 2023, {"all", "non_language", "wrong_model", "old_profile"}),
                ("chinese", 2022, {"old_cohort", "wrong_model", "old_profile"}),
                ("chinese", 2025, {"all", "chinese", "wrong_model", "old_profile"}),
                ("chinese", 2026, {"chinese", "wrong_model", "old_profile"}),
            ]:
                context = {"cohort": cohort, "major": major}
                expected = {docs[name] for name in names}
                exact = await adapter.exact(ExactRequest(query="điều 1.", student_context=context))
                lookup = await adapter.lookup(LookupRequest(document_number=" QD/2021-01 ", article=1, clause=2, student_context=context))
                semantic = await adapter.search(SearchRequest(query="x", student_context=context), vector, model)
                assert {row["document_id"] for row in exact["items"]} == expected
                assert {row["document_id"] for row in lookup["items"]} == expected
                assert {row["document_id"] for row in semantic["items"]} == expected - {docs["wrong_model"], docs["old_profile"]}
                assert semantic["warnings"]
                assert exact["items"][0]["occurrences"] == [{"start": 2, "end": 9}, {"start": 23, "end": 30}]

            context = {"cohort": 2026, "major": "chinese"}
            ranked = await adapter.search(SearchRequest(query="x", limit=1, student_context=context), vector, model)
            assert ranked["items"][0]["document_id"] == docs["chinese"]
            assert ranked["items"][0]["scores"]["cosine"] == pytest.approx(0.8)
            assert not any(key in ranked["items"][0] for key in ("embedding", "embedding_text", "payload", "object_key"))
            assert docs["unknown"] in {row["document_id"] for row in (await adapter.exact(ExactRequest(query="strasse")))["items"]}
            assert len(await adapter.options_documents()) == 8

            # Multiple chunks in one clause, duplicate document numbers and pagination.
            await database.client.create(RecordID("chunk", "chunk_" + uuid4().hex), {
                "document_id": RecordID("document", docs["chinese"].split(":")[-1]),
                "text": "Another clause passage", "embedding_text": "Another", "embedding": vector,
                "token_count": 3, "position": {"chunk_index": 1, "page_start": 2, "page_end": 2},
                "hierarchy": {"article_no": 1, "clause_no": 2}})
            body = dict(document_number="QD/2021-01", article=1, document_id=docs["chinese"], page_size=1)
            first = await adapter.lookup(LookupRequest(**body))
            second = await adapter.lookup(LookupRequest(**body, page=2))
            assert first["total"] == 2 and len(first["groups"]) == 1
            assert first["items"][0]["chunk_index"] == 0 and second["items"][0]["chunk_index"] == 1
            assert (await adapter.lookup(LookupRequest(**body, clause=3)))["total"] == 0
            exact_page = await adapter.exact(ExactRequest(query="[a.*]", page_size=1, page=2))
            assert exact_page["total"] == 8 and len(exact_page["items"]) == 1
            assert (await adapter.exact(ExactRequest(query="ĐIỀU", case_sensitive=True)))["total"] == 0
            assert (await adapter.exact(ExactRequest(query="a", document_ids=[])))["total"] == 0
            # Metadata changes affect eligibility immediately, with no vector rewrite.
            await database.client.query("UPDATE $doc SET program_scope = $scope;", {
                "doc": RecordID("document", docs["chinese"].split(":")[-1]),
                "scope": {"type": "specific_programs", "programs": ["english"]}})
            assert (await adapter.search(SearchRequest(query="x", student_context=context), vector, model))["items"] == []
        finally:
            await database.client.query("REMOVE DATABASE " + settings.surreal_database + ";")
            await database.close()
    asyncio.run(run())
