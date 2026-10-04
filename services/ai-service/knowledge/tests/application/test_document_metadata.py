from app.application.document_metadata import DocumentMetadataDetector
from app.domain.document import OcrPage


def test_detects_metadata_from_vietnamese_ocr_text() -> None:
    result = DocumentMetadataDetector().detect(
        [
            OcrPage(
                page=1,
                raw_text=(
                    "QUY CHẾ SINH VIÊN\n"
                    "Số: REG-2026-01\n"
                    "Áp dụng cho khóa 2026"
                ),
            )
        ],
        "quy_che_sinh_vien.pdf",
    )

    assert result["title"] == "QUY CHẾ SINH VIÊN"
    assert result["document_type"] == "regulation"
    assert result["document_number"] == "REG-2026-01"
    assert result["cohort"] == {"from_year": 2026, "to_year": None}
    assert result["language"] == "vi"


def test_detects_elite_cohort_and_non_language_scope_from_page_one_title() -> None:
    result = DocumentMetadataDetector().detect(
        [
            OcrPage(
                page=1,
                raw_text=(
                    "TRƯỜNG ĐẠI HỌC HOA SEN\n"
                    "QUY ĐỊNH ĐÀO TẠO\n"
                    "(Áp dụng đối với sinh viên chương trình Hoa Sen Elite "
                    "từ khoá 2023 trở về sau, đối với các ngành không chuyên ngữ)\n"
                    "Điều 1. Phạm vi điều chỉnh\n"
                    "Quy định này thay thế tài liệu áp dụng cho khóa 2020."
                ),
            ),
            OcrPage(page=2, raw_text="Phụ lục dành cho khóa 2026."),
        ],
        "quy_dinh_elite.pdf",
    )

    assert result["cohort"] == {"from_year": 2023, "to_year": None}
    assert result["program_scope"] == {
        "type": "non_language_major",
        "programs": [],
    }


def test_detects_an_explicit_cohort_range_from_page_one_title() -> None:
    result = DocumentMetadataDetector().detect(
        [
            OcrPage(
                page=1,
                raw_text=(
                    "QUY ĐỊNH ĐÀO TẠO\n"
                    "Áp dụng đối với sinh viên khóa 2023 đến khóa 2025\n"
                    "Điều 1. Phạm vi điều chỉnh"
                ),
            )
        ],
        "quy_dinh.pdf",
    )

    assert result["cohort"] == {"from_year": 2023, "to_year": 2025}


def test_leaves_a_reversed_page_one_cohort_range_undetected() -> None:
    result = DocumentMetadataDetector().detect(
        [
            OcrPage(
                page=1,
                raw_text=(
                    "QUY ĐỊNH ĐÀO TẠO\n"
                    "Áp dụng đối với sinh viên khóa 2025 đến khóa 2023\n"
                    "Điều 1. Phạm vi điều chỉnh"
                ),
            )
        ],
        "quy_dinh.pdf",
    )

    assert "cohort" not in result


def test_leaves_cohort_and_scope_undetected_without_page_one_title_evidence() -> None:
    result = DocumentMetadataDetector().detect(
        [
            OcrPage(
                page=1,
                raw_text=(
                    "QUY ĐỊNH ĐÀO TẠO\n"
                    "Điều 1. Phạm vi điều chỉnh\n"
                    "Áp dụng cho sinh viên khóa 2023 thuộc các ngành không chuyên ngữ."
                ),
            ),
            OcrPage(page=2, raw_text="Phụ lục dành cho khóa 2026."),
        ],
        "quy_dinh.pdf",
    )

    assert "cohort" not in result
    assert "program_scope" not in result
