"""Shared eligibility query and literal matching without regex interpretation."""

from urllib.parse import quote

from surrealdb import RecordID

from app.api.v1.schemas.retrieval import RetrievalRequest


def eligibility(request: RetrievalRequest) -> tuple[list[str], dict]:
    """Filter parent metadata at query time, before ranking or pagination."""
    conditions = ["document_id.status = 'active'", "document_id.process_status = 'indexed'"]
    variables = {}
    context = request.student_context
    if context is not None:
        variables.update(cohort=context.cohort, major=context.major)
        conditions += [
            "(document_id.cohort = NONE OR document_id.cohort = NULL OR "
            "(document_id.cohort.from_year <= $cohort AND "
            "(document_id.cohort.to_year = NONE OR document_id.cohort.to_year = NULL OR document_id.cohort.to_year >= $cohort)))",
            "(document_id.program_scope.type = 'all' OR "
            "(document_id.program_scope.type = 'non_language_major' AND $major = 'non_language') OR "
            "(document_id.program_scope.type = 'specific_programs' AND $major INSIDE document_id.program_scope.programs))",
        ]
    ids = getattr(request, "document_ids", None)
    discriminator = getattr(request, "document_id", None)
    if discriminator:
        ids = [discriminator]
    if ids is not None:
        conditions.append("document_id INSIDE $documents")
        variables["documents"] = [RecordID("document", value.split(":")[-1]) for value in ids]
    return conditions, variables


def literal_occurrences(text: str, query: str, case_sensitive: bool) -> list[dict[str, int]]:
    """Casefold with an origin map so expansions (e.g. ß) keep original offsets.

    Match only complete original code points; return overlapping occurrences.
    Accents and whitespace are never normalized.
    """
    if case_sensitive:
        haystack, needle = text, query
        boundaries = {index: index for index in range(len(text) + 1)}
    else:
        pieces = [character.casefold() for character in text]
        haystack, needle = "".join(pieces), query.casefold()
        boundaries = {0: 0}
        offset = 0
        for index, piece in enumerate(pieces):
            offset += len(piece)
            boundaries[offset] = index + 1
    occurrences = []
    cursor = 0
    while needle and (start := haystack.find(needle, cursor)) != -1:
        end = start + len(needle)
        if start in boundaries and end in boundaries:
            occurrences.append({"start": boundaries[start], "end": boundaries[end]})
        cursor = start + 1
    return occurrences


def public_match(row: dict) -> dict:
    document_id = str(row["document_id"])
    position = row["position"]
    return {
        "chunk_id": str(row["id"]), "text": row["text"], "document_id": document_id,
        "title": row.get("title"), "document_number": row.get("document_number"),
        "cohort": row.get("cohort"), "program_scope": row.get("program_scope"),
        "hierarchy": row["hierarchy"], "page_start": position["page_start"],
        "page_end": position["page_end"], "chunk_index": position["chunk_index"],
        "embedding_status": row["embedding_status"],
        "source_url": f"/v1/documents/{quote(document_id, safe='')}/source",
    }
