"""Job kinds supported by the knowledge application."""

from collections.abc import Collection


SUPPORTED_JOB_TYPES = frozenset({"ocr"})


def require_supported_job_type(
    job_type: str, supported_job_types: Collection[str] = SUPPORTED_JOB_TYPES
) -> str:
    """Return a registered job type or reject it before durable dispatch."""

    if job_type not in supported_job_types:
        raise ValueError(f"Unsupported job type: {job_type}")
    return job_type


def ensure_processor_coverage(processor_job_types: Collection[str]) -> None:
    """Fail startup when accepted job types and worker processors diverge."""

    processor_types = frozenset(processor_job_types)
    missing = sorted(SUPPORTED_JOB_TYPES - processor_types)
    unsupported = sorted(processor_types - SUPPORTED_JOB_TYPES)
    problems = []
    if missing:
        problems.append(f"missing processors: {', '.join(missing)}")
    if unsupported:
        problems.append(f"unsupported processors: {', '.join(unsupported)}")
    if problems:
        raise RuntimeError("Job processor registry mismatch; " + "; ".join(problems))
