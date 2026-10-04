"""Structural legal-document chunking and embedding-text construction."""

import re
from collections.abc import Mapping, Sequence
from typing import Any

_CHAPTER = re.compile(r"^Chương\s+([IVXLCDM]+|\d+)(?:\s*[:.\-]\s*|\s+)?(.*)$", re.IGNORECASE)
_ARTICLE = re.compile(r"^Điều\s+(\d+)(?:\s*[:.\-]\s*|\s+)?(.*)$", re.IGNORECASE)
_CLAUSE = re.compile(r"^Khoản\s+(\d+)(?:\s*[:.\-]\s*|\s+)?(.*)$", re.IGNORECASE)
_NUMBERED_CLAUSE = re.compile(r"^(\d+)\.(?:\s+(.*))?$")
_ROMAN = re.compile(
    r"^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$",
    re.IGNORECASE,
)
_WRAPPER_CHARS = "#*_`~"


def _recognition_text(line: str) -> str:
    """Remove only outer Markdown decoration while retaining the source line."""

    return line.strip().strip(_WRAPPER_CHARS).strip()


def _roman_to_int(value: str) -> int | None:
    value = value.upper()
    if not _ROMAN.fullmatch(value):
        return None
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    previous = 0
    for character in reversed(value):
        current = values[character]
        total += -current if current < previous else current
        previous = max(previous, current)
    return total


def _empty_hierarchy() -> dict[str, Any]:
    return {
        f"{part}_{field}": None
        for part in ("chapter", "article", "clause")
        for field in ("no", "title", "heading")
    }


def _legacy_heading(hierarchy: Mapping[str, Any], part: str, label: str) -> str | None:
    heading = hierarchy.get(f"{part}_heading")
    if heading:
        return str(heading).strip()
    number = hierarchy.get(f"{part}_no")
    if number is None:
        return None
    title = hierarchy.get(f"{part}_title")
    return f"{label} {number}" + (f": {title}" if title else "")


def _text_starts_with_heading(text: str, heading: str) -> bool:
    first_line = next((line for line in text.splitlines() if line.strip()), "")
    heading_line = next((line for line in heading.splitlines() if line.strip()), "")
    return _recognition_text(first_line) == _recognition_text(heading_line)


def build_embedding_text(hierarchy: Mapping[str, Any], text: str) -> str:
    """Build heading context without repeating the structural heading in ``text``."""

    content = text.strip()
    headers = [
        heading
        for part, label in (("chapter", "Chương"), ("article", "Điều"), ("clause", "Khoản"))
        if (heading := _legacy_heading(hierarchy, part, label))
    ]
    if headers and _text_starts_with_heading(content, headers[-1]):
        headers.pop()
    return "\n".join(headers) + ("\n\n" if headers else "") + content


def _heading_event(line: str, hierarchy: Mapping[str, Any]) -> tuple[str, int, str | None, str] | None:
    """Return ``(part, normalized number, title, clean heading)`` for a heading."""

    clean = _recognition_text(line)
    for part, matcher in (("chapter", _CHAPTER), ("article", _ARTICLE), ("clause", _CLAUSE)):
        match = matcher.fullmatch(clean)
        if not match:
            continue
        number_text, title = match.groups()
        number = (
            int(number_text)
            if number_text.isdecimal()
            else _roman_to_int(number_text)
        )
        if number is None or number < 1:
            return None
        return part, number, title.strip() or None, clean
    match = _NUMBERED_CLAUSE.fullmatch(clean)
    if match and hierarchy.get("article_no") is not None:
        number_text, title = match.groups()
        number = int(number_text)
        if number > 0:
            return "clause", number, (title or "").strip() or None, clean
    return None


def chunk_pages(pages: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Emit complete chapter, article, clause, and fallback structural chunks.

    A structural boundary, rather than a word count, determines a chunk. Parent
    headings with no own body remain hierarchy context for their descendants.
    """

    chunks: list[dict[str, Any]] = []
    hierarchy = _empty_hierarchy()
    current: dict[str, Any] | None = None
    pending: dict[str, Any] | None = None

    def flush() -> None:
        nonlocal current
        if current is None:
            return
        lines: list[tuple[str, int]] = current["lines"]
        while lines and not lines[0][0].strip():
            lines.pop(0)
        while lines and not lines[-1][0].strip():
            lines.pop()
        if lines:
            text = "\n".join(line for line, _ in lines)
            chunks.append({
                "text": text,
                "hierarchy": current["hierarchy"],
                "position": {
                    "chunk_index": len(chunks),
                    "page_start": lines[0][1],
                    "page_end": lines[-1][1],
                },
                "token_count": len(re.findall(r"\S+", text)),
                "embedding_text": build_embedding_text(current["hierarchy"], text),
            })
        current = None

    def start_pending_body(line: str, page_no: int) -> None:
        nonlocal current, pending
        if pending is None:
            current = {"hierarchy": dict(hierarchy), "lines": [(line, page_no)]}
            return
        current = {
            "hierarchy": dict(hierarchy),
            "lines": [*pending["lines"], (line, page_no)],
        }
        pending = None

    def flush_pending_article() -> None:
        nonlocal current, pending
        if pending is not None and pending["part"] == "article":
            current = {"hierarchy": dict(hierarchy), "lines": pending["lines"]}
            pending = None
            flush()

    previous_page: int | None = None
    for page in sorted(pages, key=lambda item: int(item["page"])):
        page_no = int(page["page"])
        # An excluded page is a hard structural boundary: context and partial
        # chunks must not leak into the next selected run.
        if previous_page is not None and page_no != previous_page + 1:
            flush()
            flush_pending_article()
            hierarchy = _empty_hierarchy()
        previous_page = page_no
        value = page.get("text") if "text" in page else (page.get("raw_text") or "")
        for line in str(value).splitlines():
            event = _heading_event(line, hierarchy)
            if event:
                flush()
                part, number, title, clean_heading = event
                if part == "clause":
                    pending = None
                else:
                    flush_pending_article()
                    pending = None
                if part == "chapter":
                    hierarchy.update(_empty_hierarchy())
                elif part == "article":
                    hierarchy.update(clause_no=None, clause_title=None, clause_heading=None)
                else:
                    hierarchy.update(clause_no=None, clause_title=None, clause_heading=None)
                hierarchy[f"{part}_no"] = number
                hierarchy[f"{part}_title"] = title
                hierarchy[f"{part}_heading"] = clean_heading
                if part == "clause":
                    current = {"hierarchy": dict(hierarchy), "lines": [(line, page_no)]}
                else:
                    pending = {
                        "part": part,
                        "needs_chapter_title": part == "chapter" and title is None,
                        "lines": [(line, page_no)],
                        "clean_heading": clean_heading,
                    }
                continue

            if not line.strip():
                if current is not None:
                    current["lines"].append((line, page_no))
                elif pending is not None:
                    pending["lines"].append((line, page_no))
                continue

            if pending and pending["needs_chapter_title"]:
                title = _recognition_text(line)
                hierarchy["chapter_title"] = title or None
                hierarchy["chapter_heading"] = (
                    f"{pending['clean_heading']}\n{title}" if title else pending["clean_heading"]
                )
                pending["lines"].append((line, page_no))
                pending["needs_chapter_title"] = False
                continue
            if current is None:
                start_pending_body(line, page_no)
            else:
                current["lines"].append((line, page_no))
    flush()
    flush_pending_article()
    return chunks
