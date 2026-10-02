from app.application.chunking import build_embedding_text, chunk_pages


def test_hierarchy_and_page_span():
    chunks = chunk_pages([
        {"page": 1, "raw_text": "Chương 1: Quy định chung\nĐiều 2: Học tập\nKhoản 3: Bắt buộc\nSinh viên phải"},
        {"page": 2, "raw_text": "đăng ký học phần.\n## Điều 3. Miễn học\nSinh viên được miễn."},
    ])
    clause = next(chunk for chunk in chunks if chunk["hierarchy"]["clause_no"] == 3)
    article = next(chunk for chunk in chunks if chunk["hierarchy"]["article_no"] == 3)
    assert clause["position"]["page_end"] == 2
    assert article["position"]["page_start"] == 2
    assert clause["embedding_text"].startswith("Chương 1: Quy định chung\nĐiều 2: Học tập\nKhoản 3")


def test_long_plain_text_splits_without_losing_words():
    chunks = chunk_pages([{"page": 1, "raw_text": "one two three four five six seven"}], 3)
    assert [chunk["token_count"] for chunk in chunks] == [3, 3, 1]
    assert " ".join(chunk["text"] for chunk in chunks) == "one two three four five six seven"
    assert build_embedding_text({}, " hello ") == "hello"
