"""Deterministic first-pass metadata detection from OCR text."""

import re
import unicodedata
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
_COHORT_RANGE_PATTERN = re.compile(
    r"(?:từ\s+)?(?:khóa|khoá|khoa|cohort)\s*(?:năm\s*)?(20\d{2})\s*"
    r"(?:đến|tới|to|-)\s*(?:(?:khóa|khoá|khoa|cohort)\s*)?"
    r"(?:năm\s*)?(20\d{2})",
    re.IGNORECASE,
)
_COHORT_START_PATTERN = re.compile(
    r"(?:từ\s+)?(?:khóa|khoá|khoa|cohort)\s*(?:năm\s*)?(20\d{2})",
    re.IGNORECASE,
)
_TITLE_BLOCK_END_PATTERN = re.compile(
    r"^(?:điều\s+\d+|chương\s+[\divxlcdm]+|mục\s+\d+|\d+[.)]\s|nơi nhận\b|căn cứ\b)",
    re.IGNORECASE,
)
_NON_LANGUAGE_MAJOR_PATTERN = re.compile(
    r"(?:các\s+)?ngành\s+không\s+chuyên\s+(?:ngôn\s+ngữ|ngoại\s+ngữ|ngữ)",
    re.IGNORECASE,
)
_LANGUAGE_MAJOR_PATTERN = re.compile(
    r"(?:các\s+)?ngành\s+(?:chuyên\s+)?(?:ngôn\s+ngữ|ngoại\s+ngữ|ngữ)",
    re.IGNORECASE,
)


class DocumentMetadataDetector:
    """Small auditable ruleset; all results are intentionally sent to review."""

    def detect(
        self, pages: list[OcrPage], original_filename: str
    ) -> dict[str, object]:
        """Return only values supported by deterministic filename/text rules."""

        text = "\n".join(page.raw_text for page in pages)
        normalized = text.casefold()
        title_block = _page_one_title_block(pages)
        metadata: dict[str, object] = {
            "title": _detect_title(pages, original_filename),
            "document_type": _detect_document_type(normalized),
            "language": _detect_language(normalized),
        }
        document_number = _DOCUMENT_NUMBER_PATTERN.search(text)
        if document_number is not None:
            metadata["document_number"] = document_number.group(1)
        cohort = _detect_cohort(title_block)
        if cohort is not None:
            metadata["cohort"] = cohort
        program_scope = _detect_program_scope(title_block)
        if program_scope is not None:
            metadata["program_scope"] = program_scope
        return metadata


def _detect_title(pages: list[OcrPage], original_filename: str) -> str:
    """Use the first substantive OCR line, falling back to the source filename."""

    if pages:
        for line in pages[0].raw_text.splitlines():
            candidate = " ".join(line.split())
            if 4 <= len(candidate) <= 180:
                return candidate
    return Path(original_filename).stem.replace("_", " ").strip() or "Untitled document"


def _page_one_title_block(pages: list[OcrPage]) -> str:
    """Return the page-one heading and applicability lines before document body."""

    page_one = next((page for page in pages if page.page == 1), None)
    if page_one is None:
        return ""
    lines: list[str] = []
    for raw_line in page_one.raw_text.splitlines():
        line = " ".join(raw_line.split())
        if not line:
            continue
        if _TITLE_BLOCK_END_PATTERN.match(line):
            break
        lines.append(line)
    return unicodedata.normalize("NFC", "\n".join(lines)).casefold()


def _detect_document_type(text: str) -> str:
    for keyword, document_type in _DOCUMENT_TYPE_RULES:
        if keyword in text:
            return document_type
    return "other"


def _detect_cohort(title_block: str) -> dict[str, int | None] | None:
    cohort_range = _COHORT_RANGE_PATTERN.search(title_block)
    if cohort_range is not None:
        from_year, to_year = (int(value) for value in cohort_range.groups())
        if to_year >= from_year:
            return {"from_year": from_year, "to_year": to_year}
        return None
    cohort_start = _COHORT_START_PATTERN.search(title_block)
    if cohort_start is None:
        return None
    return {"from_year": int(cohort_start.group(1)), "to_year": None}


def _detect_program_scope(title_block: str) -> dict[str, object] | None:
    if _NON_LANGUAGE_MAJOR_PATTERN.search(title_block):
        return {"type": "non_language_major", "programs": []}
    if _LANGUAGE_MAJOR_PATTERN.search(title_block):
        return {"type": "language_major", "programs": []}
    return None


def _detect_language(text: str) -> str:
    if any(character in text for character in "ăâđêôơư"):
        return "vi"
    if any(keyword in text for keyword in ("the", "and", "student", "regulation")):
        return "en"
    return "unknown"
