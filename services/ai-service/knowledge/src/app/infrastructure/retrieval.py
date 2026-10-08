"""Exact filtered cosine ranking and database-backed structured lookup."""

from app.application.retrieval import eligibility, literal_occurrences, public_match
from app.api.v1.schemas.retrieval import ExactRequest, LookupRequest, SearchRequest
from app.infrastructure.embeddings import embedding_profile, validate_vector

PROJECTION = (
    "id, text, document_id, document_id.title AS title, "
    "document_id.document_number AS document_number, document_id.cohort AS cohort, "
    "document_id.program_scope AS program_scope, hierarchy, position, embedding_status, "
    "position.page_start AS page_start, position.chunk_index AS chunk_index"
)
ORDER = "document_id ASC, page_start ASC, chunk_index ASC, id ASC"


class RetrievalDatabase:
    """Uses the Knowledge connection; never reads private job data or source keys."""

    def __init__(self, database):
        self.database = database

    async def options_documents(self) -> list[dict]:
        rows = await self.database.client.query(
            "SELECT id, title, document_number FROM document "
            "WHERE status = 'active' AND process_status = 'indexed' ORDER BY id ASC;"
        )
        return [{"document_id": str(row["id"]), "title": row.get("title"),
                 "document_number": row.get("document_number")} for row in rows]

    async def search(self, request: SearchRequest, vector: list[float], model: str) -> dict:
        validate_vector(vector)
        conditions, variables = eligibility(request)
        variables.update(vector=vector, model=model, profile=embedding_profile(model), limit=request.limit)
        compatible = "document_id.embedding_model = $model AND document_id.embedding_profile = $profile"
        excluded = await self.database.client.query(
            "SELECT count() AS total FROM chunk WHERE " + " AND ".join(conditions) +
            f" AND NOT ({compatible}) GROUP ALL;", variables,
        )
        conditions += [compatible, "vector::magnitude(embedding) > 0"]
        rows = await self.database.client.query(
            f"SELECT {PROJECTION}, vector::similarity::cosine(embedding, $vector) AS cosine "
            "FROM chunk WHERE " + " AND ".join(conditions) +
            " ORDER BY cosine DESC, id ASC LIMIT $limit;", variables,
        )
        items = [{**public_match(row), "rank": index + 1, "scores": {"cosine": row["cosine"]}}
                 for index, row in enumerate(rows)]
        warnings = []
        if excluded and excluded[0]["total"]:
            warnings.append("Some chunks were excluded because their embedding model or task profile differs. Re-index their documents to include them.")
        return {"items": items, "total": len(items), "warnings": warnings}

    async def lookup(self, request: LookupRequest) -> dict:
        conditions, variables = eligibility(request)
        variables.update(number=request.document_number, article=request.article,
                         limit=request.page_size, offset=(request.page - 1) * request.page_size)
        conditions += ["string::trim(document_id.document_number ?? '') = $number", "hierarchy.article_no = $article"]
        if request.clause is not None:
            conditions.append("hierarchy.clause_no = $clause")
            variables["clause"] = request.clause
        where = " AND ".join(conditions)
        groups = await self.database.client.query(
            "SELECT document_id, document_id.title AS title, count() AS total FROM chunk WHERE "
            + where + " GROUP BY document_id ORDER BY document_id ASC;", variables,
        )
        rows = await self.database.client.query(
            f"SELECT {PROJECTION} FROM chunk WHERE {where} ORDER BY {ORDER} LIMIT $limit START $offset;", variables,
        )
        return {"items": [public_match(row) for row in rows], "total": sum(group["total"] for group in groups),
                "groups": [{**group, "document_id": str(group["document_id"])} for group in groups]}

    async def exact(self, request: ExactRequest) -> dict:
        conditions, variables = eligibility(request)
        # Stream deterministic batches: casefold expansions cannot safely be prefiltered
        # by SurrealDB lowercase(). No candidate cap may silently truncate totals.
        variables.update(limit=500, offset=0)
        query = f"SELECT {PROJECTION} FROM chunk WHERE " + " AND ".join(conditions) + f" ORDER BY {ORDER} LIMIT $limit START $offset;"
        start = (request.page - 1) * request.page_size
        total, items = 0, []
        while True:
            rows = await self.database.client.query(query, variables)
            for row in rows:
                occurrences = literal_occurrences(row["text"], request.query, request.case_sensitive)
                if occurrences:
                    if start <= total < start + request.page_size:
                        items.append({**public_match(row), "occurrences": occurrences})
                    total += 1
            if len(rows) < variables["limit"]:
                break
            variables["offset"] += len(rows)
        return {"items": items, "total": total}
