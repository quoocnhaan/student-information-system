"""Deterministic first-pass metadata detection from OCR text."""

import re
from pathlib import Path

from app.domain.document import OcrPage


_DOCUMENT_TYPE_RULES: tuple[tuple[str, str], ...] = (
    ("quy chế", "regulation"),
    ("quy định", "regulation"),
    ("quyết định", "decision"),
    ("thông báo", "notice"),
    ("hướng dẫn", "guidance"),
)
_DOCUMENT_NUMBER_PATTERN = re.compile(
    r"(?:số|so)\s*[:.]?\s*([A-ZĐ0-9][A-ZĐ0-9./_-]{2,})", re.IGNORECASE
)
_COHORT_PATTERN = re.compile(
    r"(?:khóa|khoa|cohort)\s*(?:năm\s*)?(20\d{2})", re.IGNORECASE
)


class DocumentMetadataDetector:
    """Small auditable ruleset; all results are intentionally sent to review."""

    def detect(
        self, pages: list[OcrPage], original_filename: str
    ) -> dict[str, object]:
        """Return only values supported by deterministic filename/text rules."""

        text = "\n".join(page.raw_text for page in pages)
        normalized = text.casefold()
        metadata: dict[str, object] = {
            "title": _detect_title(pages, original_filename),
            "document_type": _detect_document_type(normalized),
            "program_scope": _detect_program_scope(normalized),
            "language": _detect_language(normalized),
        }
        document_number = _DOCUMENT_NUMBER_PATTERN.search(text)
        if document_number is not None:
            metadata["document_number"] = document_number.group(1)
        cohort = _COHORT_PATTERN.search(normalized)
        if cohort is not None:
            year = int(cohort.group(1))
            metadata["cohort"] = {"from_year": year, "to_year": None}
        return metadata


def _detect_title(pages: list[OcrPage], original_filename: str) -> str:
    """Use the first substantive OCR line, falling back to the source filename."""

    if pages:
        for line in pages[0].raw_text.splitlines():
            candidate = " ".join(line.split())
            if 4 <= len(candidate) <= 180:
                return candidate
    return Path(original_filename).stem.replace("_", " ").strip() or "Untitled document"


def _detect_document_type(text: str) -> str:
    for keyword, document_type in _DOCUMENT_TYPE_RULES:
        if keyword in text:
            return document_type
    return "other"


def _detect_program_scope(text: str) -> dict[str, object]:
    if "ngôn ngữ" in text or "ngoại ngữ" in text:
        return {"type": "language_major", "programs": []}
    return {"type": "all", "programs": []}


def _detect_language(text: str) -> str:
    if any(character in text for character in "ăâđêôơư"):
        return "vi"
    if any(keyword in text for keyword in ("the", "and", "student", "regulation")):
        return "en"
    return "unknown"
