"""HTTP adapters for job lifecycle and Knowledge OCR input/output."""

import asyncio

import httpx

from worker_service.config import Settings


class PermanentError(RuntimeError):
    pass


class TemporaryError(RuntimeError):
    pass


class HttpClient:
    def __init__(self, base_url: str, token: str, timeout: float = 15) -> None:
        self.client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout)
        self.headers = {"Authorization": f"Bearer {token}"}

    async def close(self) -> None:
        await self.client.aclose()

    async def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        try:
            response = await self.client.request(method, path, headers=self.headers, **kwargs)
        except httpx.HTTPError as error:
            raise TemporaryError(str(error)) from error
        if response.status_code in (400, 401, 403, 404, 409, 413, 422):
            raise PermanentError(f"{response.status_code}: {response.text[:200]}")
        if response.status_code >= 500:
            raise TemporaryError(f"{response.status_code}: {response.text[:200]}")
        response.raise_for_status()
        return response


class JobClient(HttpClient):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings.job_service_url, settings.job_token)

    async def claim(self, job_id: str, claim_id: str, owner: str, type_: str) -> dict:
        response = await self.request("POST", f"/internal/v1/jobs/{job_id}/claim", json={"claim_id": claim_id, "owner": owner, "type": type_})
        return response.json()

    async def progress(self, job_id: str, claim_id: str, **changes) -> dict:
        response = await self.request("PATCH", f"/internal/v1/jobs/{job_id}/progress", json={"claim_id": claim_id, **changes})
        return response.json()

    async def complete(self, job_id: str, claim_id: str, result_ref: str) -> dict:
        response = await self.request("POST", f"/internal/v1/jobs/{job_id}/complete", json={"claim_id": claim_id, "result_ref": result_ref})
        return response.json()

    async def fail(self, job_id: str, claim_id: str, error: str) -> dict:
        response = await self.request("POST", f"/internal/v1/jobs/{job_id}/fail", json={"claim_id": claim_id, "error": error[:500] or "Job processing failed"})
        return response.json()


class KnowledgeClient(HttpClient):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings.knowledge_url, settings.knowledge_token, timeout=60)

    async def source(self, job_id: str, claim_id: str) -> bytes:
        response = await self.request("GET", f"/internal/v1/knowledge/jobs/{job_id}/source", params={"claim_id": claim_id})
        return response.content

    async def result(self, job_id: str, claim_id: str, pages: list[dict]) -> str:
        response = await self.request("POST", f"/internal/v1/knowledge/jobs/{job_id}/result", json={"claim_id": claim_id, "pages": pages})
        return response.json()["ocr_draft_id"]

    async def fail(self, job_id: str, claim_id: str) -> None:
        await self.request("POST", f"/internal/v1/knowledge/jobs/{job_id}/fail", json={"claim_id": claim_id})


async def retry_temporary(operation, *, delay: float = 1.0):
    """Retry callback transport failures; never rerun OCR itself."""

    while True:
        try:
            return await operation()
        except TemporaryError:
            await asyncio.sleep(delay)
            delay = min(delay * 2, 30)
