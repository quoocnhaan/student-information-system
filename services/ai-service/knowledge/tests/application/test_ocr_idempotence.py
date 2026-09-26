"""OCR completion remains safe when the same delivery is seen again."""

import asyncio

from app.application.ocr_jobs import OcrJobProcessor
from app.domain.document import OcrPage


class _Database:
    def __init__(self) -> None:
        self.draft_id: str | None = None
        self.worker_ids: list[str] = []
        self.metadata: dict | None = None

    async def get_document(self, _record_id: str):
        return {
            "source": {
                "object_key": "documents/doc_a/original.pdf",
                "original_filename": "rules.pdf",
            }
        }

    async def update_job(self, _job_id: str, _changes: dict, worker_id: str):
        self.worker_ids.append(worker_id)
        return True

    async def create_ocr_draft(self, record_id: str, _document_id: str, _pages: list):
        self.draft_id = record_id

    async def update_document_after_ocr(self, _record_id: str, _count: int, metadata: dict):
        self.metadata = metadata

    async def complete_job(
        self, _job_id: str, _draft_id: str, _count: int, worker_id: str
    ):
        self.worker_ids.append(worker_id)
        return True


class _Store:
    async def get_bytes(self, _object_key: str) -> bytes:
        return b"pdf"


class _Ocr:
    async def extract_pdf(self, _data: bytes, on_page_count, on_page_processed):
        await on_page_count(1)
        await on_page_processed(1, 1)
        return [OcrPage(page=1, raw_text="QUY DINH DAO TAO")]


def test_draft_id_is_stable_and_every_progress_write_is_owned() -> None:
    database = _Database()
    processor = OcrJobProcessor(database, _Store(), _Ocr())

    asyncio.run(
        processor.process(
            {
                "id": "job:job_a",
                "document_id": "document:doc_a",
                "worker_id": "worker-a",
            }
        )
    )

    assert database.draft_id == "ocr_job_a"
    assert database.worker_ids
    assert set(database.worker_ids) == {"worker-a"}


class _EliteOcr:
    async def extract_pdf(self, _data: bytes, on_page_count, on_page_processed):
        await on_page_count(1)
        await on_page_processed(1, 1)
        return [
            OcrPage(
                page=1,
                raw_text=(
                    "QUY ĐỊNH ĐÀO TẠO\n"
                    "Áp dụng đối với sinh viên chương trình Hoa Sen Elite từ khóa 2023 "
                    "trở về sau, đối với các ngành không chuyên ngữ\n"
                    "Điều 1. Phạm vi điều chỉnh"
                ),
            )
        ]


def test_worker_saves_page_one_cohort_and_programme_scope() -> None:
    database = _Database()
    processor = OcrJobProcessor(database, _Store(), _EliteOcr())

    asyncio.run(
        processor.process(
            {
                "id": "job:job_a",
                "document_id": "document:doc_a",
                "worker_id": "worker-a",
            }
        )
    )

    assert database.metadata is not None
    assert database.metadata["cohort"] == {"from_year": 2023, "to_year": None}
    assert database.metadata["program_scope"] == {
        "type": "non_language_major",
        "programs": [],
    }
