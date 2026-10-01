"""Knowledge's HTTP adapter to the central job service."""

import httpx

from app.config import Settings


class JobServiceError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class JobServiceClient:
    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.job_service_url.rstrip("/")
        self.token = settings.job_service_owner_token
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=10)

    async def close(self) -> None:
        await self.client.aclose()

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    async def create(self, *, job_type: str, subject_id: str, creation_key: str) -> dict:
        try:
            response = await self.client.post(
                "/internal/v1/jobs", headers=self.headers(),
                json={"owner": "knowledge", "type": job_type, "subject_id": subject_id, "creation_key": creation_key},
            )
            response.raise_for_status() #return API response code
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise JobServiceError("Central job creation failed") from error

    async def get(self, job_id: str) -> dict | None:
        try:
            response = await self.client.get(f"/v1/jobs/{job_id}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise JobServiceError("Central job read failed") from error

    async def find_creation(self, document_id: str) -> dict | None:
        try:
            response = await self.client.get(
                f"/internal/v1/jobs/by-creation/knowledge/{document_id}",
                headers=self.headers(),
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise JobServiceError("Central job lookup failed") from error

    async def verify(self, job_id: str, claim_id: str) -> dict:
        try:
            response = await self.client.get(
                f"/internal/v1/jobs/{job_id}/claims/{claim_id}", headers=self.headers()
            )
            if response.status_code in (404, 409):
                raise JobServiceError("Claim is not active", response.status_code)
            response.raise_for_status()
            data = response.json()
            if data.get("owner") != "knowledge" or data.get("type") != "ocr_pdf":
                raise JobServiceError("Wrong job owner or type", 409)
            return data
        except JobServiceError:
            raise
        except (httpx.HTTPError, ValueError) as error:
            raise JobServiceError("Central job claim verification failed") from error

    async def ready(self) -> bool:
        try:
            response = await self.client.get("/ready")
            return response.status_code == 200
        except httpx.HTTPError:
            return False
