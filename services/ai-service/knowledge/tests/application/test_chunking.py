from app.application.chunking import build_embedding_text, chunk_pages
from app.domain.document import ChunkHierarchy


def test_contract_clause_chunk_embeds_complete_parent_context() -> None:
    source = (
        "Chương I. Student Affairs\n"
        "Điều 1. Student Records\n"
        "Khoản 1. Required information\n\n"
        "a) Full name\n"
        "b) Date of birth\n"
        "c) Student ID"
    )
    [chunk] = chunk_pages([{"page": 1, "raw_text": source}])
    assert chunk["text"] == source.split("\n", 2)[2]
    assert chunk["hierarchy"] == {
        "chapter_no": 1, "chapter_title": "Student Affairs", "chapter_heading": "Chương I. Student Affairs",
        "article_no": 1, "article_title": "Student Records", "article_heading": "Điều 1. Student Records",
        "clause_no": 1, "clause_title": "Required information", "clause_heading": "Khoản 1. Required information",
    }
    assert chunk["embedding_text"] == source.replace("Điều 1. Student Records\n", "Điều 1. Student Records\n\n")


def test_adjacent_and_repeated_clauses_are_complete_distinct_chunks() -> None:
    chunks = chunk_pages([{"page": 1, "raw_text": (
        "Điều 2. Rules\nKhoản 1. First\nOne\nKhoản 1. Repeated\nTwo\nKhoản 2. Last\nThree"
    )}])
    assert [chunk["text"] for chunk in chunks] == [
        "Khoản 1. First\nOne", "Khoản 1. Repeated\nTwo", "Khoản 2. Last\nThree",
    ]
    assert [chunk["position"]["chunk_index"] for chunk in chunks] == [0, 1, 2]
    assert [chunk["hierarchy"]["clause_no"] for chunk in chunks] == [1, 1, 2]


def test_long_clause_preserves_paragraphs_lists_and_page_continuation() -> None:
    words = " ".join(f"word{index}" for index in range(600))
    [chunk] = chunk_pages([
        {"page": 2, "raw_text": "b) continued\n\n" + words},
        {"page": 1, "raw_text": "Điều 1. Scope\nKhoản 1. Long clause\n\na) starts"},
    ])
    assert chunk["text"] == "Khoản 1. Long clause\n\na) starts\nb) continued\n\n" + words
    assert chunk["position"] == {"chunk_index": 0, "page_start": 1, "page_end": 2}
    assert chunk["token_count"] > 512


def test_heading_variants_and_bare_chapter_title_supply_context() -> None:
    [chunk] = chunk_pages([
        {"page": 2, "raw_text": "Student Affairs\n**Điều 3. Student Records**\n1. Required information\na) Name"},
        {"page": 1, "raw_text": "## Chương II\n"},
    ])
    hierarchy = chunk["hierarchy"]
    assert hierarchy["chapter_no"] == 2
    assert hierarchy["chapter_heading"] == "Chương II\nStudent Affairs"
    assert hierarchy["article_heading"] == "Điều 3. Student Records"
    assert hierarchy["clause_heading"] == "1. Required information"
    assert chunk["text"] == "1. Required information\na) Name"
    assert chunk["embedding_text"].startswith("Chương II\nStudent Affairs\nĐiều 3. Student Records\n\n")


def test_outside_clause_content_is_retained_once() -> None:
    chunks = chunk_pages([{"page": 1, "raw_text": (
        "Opening text\n\nChương 1. General\nChapter body\n"
        "Điều 1. Article\nPreamble\nKhoản 1. Clause\nClause body\n"
        "Điều 2. No clauses"
    )}])
    assert [chunk["text"] for chunk in chunks] == [
        "Opening text", "Chương 1. General\nChapter body", "Điều 1. Article\nPreamble",
        "Khoản 1. Clause\nClause body", "Điều 2. No clauses",
    ]
    assert [chunk["hierarchy"]["clause_no"] for chunk in chunks] == [None, None, None, 1, None]
    assert chunks[1]["hierarchy"]["article_no"] is None
    assert chunks[4]["hierarchy"]["article_no"] == 2


def test_text_precedence_page_spans_and_legacy_embedding_context() -> None:
    chunks = chunk_pages([
        {"page": 3, "raw_text": "ignored"},
        {"page": 1, "raw_text": "raw", "corrected_text": "corrected", "reviewed_text": "reviewed"},
        {"page": 2, "raw_text": "raw two", "corrected_text": "corrected two", "reviewed_text": ""},
    ])
    assert [chunk["text"] for chunk in chunks] == ["reviewed\nignored"]
    assert chunks[0]["position"] == {"chunk_index": 0, "page_start": 1, "page_end": 3}
    assert chunks[0]["token_count"] == 2


def test_selected_page_gap_flushes_chunk_and_structural_context() -> None:
    chunks = chunk_pages([
        {"page": 1, "text": "First selected page"},
        {"page": 3, "text": "Third selected page"},
    ])

    assert [chunk["text"] for chunk in chunks] == ["First selected page", "Third selected page"]
    assert [chunk["position"] for chunk in chunks] == [
        {"chunk_index": 0, "page_start": 1, "page_end": 1},
        {"chunk_index": 1, "page_start": 3, "page_end": 3},
    ]
    assert build_embedding_text(
        {"chapter_no": 1, "chapter_title": "General", "article_no": 2, "article_title": "Rules"},
        "hello",
    ) == "Chương 1: General\nĐiều 2: Rules\n\nhello"
    assert build_embedding_text({}, " hello ") == "hello"
    assert ChunkHierarchy(chapter_no=1).chapter_heading is None
