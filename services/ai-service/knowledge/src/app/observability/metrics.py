"""Prometheus metrics for Knowledge API maintenance."""

from prometheus_client import Counter

ORPHAN_CLEANUP = Counter(
    "knowledge_orphan_cleanup_total",
    "Source-object orphan cleanup decisions",
    ["result"],
)
