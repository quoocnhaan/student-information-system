"""Pure legal-document chunking and shared embedding-text construction."""

import re
from collections.abc import Mapping, Sequence
from typing import Any


_MARKER = re.compile(r"^\s*(Chương|Điều|Khoản)\s+(\d+)(?:\s*[:.\-]\s*|\s+)?(.*)$", re.I)
_NUMBERED = re.compile(r"^\s*(\d+)\.\s+(.+)$")


def build_embedding_text(hierarchy: Mapping[str, Any], text: str) -> str:
    headers = []
    for label, prefix in (("Chương", "chapter"), ("Điều", "article"), ("Khoản", "clause")):
        number = hierarchy.get(f"{prefix}_no")
        if number is not None:
            title = hierarchy.get(f"{prefix}_title")
            headers.append(f"{label} {number}" + (f": {title}" if title else ""))
    return "\n".join(headers) + ("\n\n" if headers else "") + text.strip()


def chunk_pages(pages: Sequence[Mapping[str, Any]], max_tokens: int = 512) -> list[dict[str, Any]]:
    """Split reviewed text at legal headings and paragraph/word boundaries."""
    if max_tokens < 1:
        raise ValueError("max_tokens must be positive")
    segments: list[tuple[str, int, dict[str, Any]]] = []
    hierarchy: dict[str, Any] = {f"{part}_{field}": None for part in ("chapter", "article", "clause") for field in ("no", "title")}
    for page in sorted(pages, key=lambda item: int(item["page"])):
        page_no = int(page["page"])
        value = page.get("reviewed_text") or page.get("corrected_text") or page.get("raw_text") or ""
        for line in str(value).splitlines():
            line = line.strip()
            if not line:
                segments.append(("", page_no, dict(hierarchy)))
                continue
            marker_line = re.sub(r"^[\s#*_]+|[\s#*_]+$", "", line).strip()
            match = _MARKER.match(marker_line)
            if match:
                label, number, title = match.groups()
                part = {"chương": "chapter", "điều": "article", "khoản": "clause"}[label.lower()]
                if part == "chapter":
                    hierarchy.update(article_no=None, article_title=None, clause_no=None, clause_title=None)
                elif part == "article":
                    hierarchy.update(clause_no=None, clause_title=None)
                hierarchy[f"{part}_no"] = int(number)
                hierarchy[f"{part}_title"] = title or None
            elif _NUMBERED.match(marker_line) and hierarchy["article_no"] is not None:
                number, title = _NUMBERED.match(marker_line).groups()
                hierarchy.update(clause_no=int(number), clause_title=title)
            segments.append((line, page_no, dict(hierarchy)))

    groups: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line, page_no, state in segments:
        if not line:
            if current is not None:
                current["lines"].append(("", page_no))
            continue
        if current is None or state != current["hierarchy"]:
            current = {"lines": [], "hierarchy": state}
            groups.append(current)
        current["lines"].append((line, page_no))

    chunks: list[dict[str, Any]] = []
    for group in groups:
        paragraphs: list[list[tuple[str, int]]] = []
        paragraph: list[tuple[str, int]] = []
        for line, page_no in group["lines"]:
            if not line:
                if paragraph:
                    paragraphs.append(paragraph)
                    paragraph = []
            else:
                paragraph.extend((word, page_no) for word in line.split())
        if paragraph:
            paragraphs.append(paragraph)
        pieces: list[list[tuple[str, int]]] = []
        current_piece: list[tuple[str, int]] = []
        for paragraph in paragraphs:
            while paragraph:
                room = max_tokens - len(current_piece)
                if len(paragraph) <= room:
                    current_piece.extend(paragraph)
                    paragraph = []
                elif current_piece and len(paragraph) <= max_tokens:
                    pieces.append(current_piece)
                    current_piece = []
                else:
                    current_piece.extend(paragraph[:room])
                    paragraph = paragraph[room:]
                    pieces.append(current_piece)
                    current_piece = []
        if current_piece:
            pieces.append(current_piece)
        for piece in pieces:
            if piece:
                text = " ".join(word for word, _ in piece)
                chunks.append({"text": text, "hierarchy": group["hierarchy"],
                               "position": {"chunk_index": len(chunks), "page_start": piece[0][1], "page_end": piece[-1][1]},
                               "token_count": len(piece), "embedding_text": build_embedding_text(group["hierarchy"], text)})
    return chunks
