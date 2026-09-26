"""Job type registration stays consistent with worker processor coverage."""

import pytest

from app.domain.job_types import ensure_processor_coverage


def test_every_supported_job_type_must_have_exactly_one_processor() -> None:
    ensure_processor_coverage({"ocr"})

    with pytest.raises(RuntimeError, match="missing processors: ocr"):
        ensure_processor_coverage(set())

    with pytest.raises(RuntimeError, match="unsupported processors: embed"):
        ensure_processor_coverage({"ocr", "embed"})
