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
