"""Knowledge job creation forwards each producer's job identity."""

import asyncio
import json

import httpx
import pytest

from app.config import Settings
from app.infrastructure.job_service import JobServiceClient, JobServiceError


def test_create_forwards_job_type_subject_and_creation_key() -> None:
    requests: list[dict] = []

    def respond(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/internal/v1/jobs"
        assert request.headers["authorization"] == "Bearer owner-token"
        requests.append(json.loads(request.content))
        return httpx.Response(201, json={"id": f"job:{len(requests)}"})

    async def run() -> None:
        client = JobServiceClient(Settings(job_service_owner_token="owner-token"))
        await client.client.aclose()
        client.client = httpx.AsyncClient(
            base_url=client.base_url, transport=httpx.MockTransport(respond)
        )
        try:
            assert await client.create(
                job_type="ocr_pdf",
                subject_id="document:doc_1",
                creation_key="document:doc_1",
            ) == {"id": "job:1"}
            assert await client.create(
                job_type="embed_document",
                subject_id="document:doc_1",
                creation_key="embed:document:doc_1:v1",
            ) == {"id": "job:2"}
        finally:
            await client.close()

    asyncio.run(run())
    assert requests == [
        {
            "owner": "knowledge",
            "type": "ocr_pdf",
            "subject_id": "document:doc_1",
            "creation_key": "document:doc_1",
        },
        {
            "owner": "knowledge",
            "type": "embed_document",
            "subject_id": "document:doc_1",
            "creation_key": "embed:document:doc_1:v1",
        },
    ]


def test_create_translates_service_errors() -> None:
    async def run() -> None:
        client = JobServiceClient(Settings())
        await client.client.aclose()
        client.client = httpx.AsyncClient(
            base_url=client.base_url,
            transport=httpx.MockTransport(lambda _: httpx.Response(503)),
        )
        try:
            with pytest.raises(JobServiceError, match="Central job creation failed"):
                await client.create(
                    job_type="ocr_pdf",
                    subject_id="document:doc_1",
                    creation_key="document:doc_1",
                )
        finally:
            await client.close()

    asyncio.run(run())


def test_verify_rejects_non_ocr_claim() -> None:
    async def run() -> None:
        client = JobServiceClient(Settings())
        await client.client.aclose()
        client.client = httpx.AsyncClient(
            base_url=client.base_url,
            transport=httpx.MockTransport(
                lambda _: httpx.Response(200, json={"owner": "knowledge", "type": "embed_document"})
            ),
        )
        try:
            with pytest.raises(JobServiceError, match="Wrong job owner or type") as error:
                await client.verify("job:1", "claim-1")
            assert error.value.status_code == 409
        finally:
            await client.close()

    asyncio.run(run())
