"""Private object storage for source PDFs and derived images."""

from io import BufferedReader

from anyio import to_thread
from minio import Minio

from app.config import Settings


class ObjectStoreError(RuntimeError):
    """Raised when an object operation cannot be completed."""


class MinioObjectStore:
    """Small interface over MinIO used by document-ingestion use cases."""

    def __init__(self, settings: Settings) -> None:
        if not settings.minio_access_key or not settings.minio_secret_key:
            raise ObjectStoreError(
                "MINIO_ACCESS_KEY/MINIO_SECRET_KEY or MINIO_ROOT_USER/"
                "MINIO_ROOT_PASSWORD must be configured"
            )
        self._bucket = settings.minio_bucket
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    async def put_pdf(
        self, object_key: str, stream: BufferedReader, length: int
    ) -> None:
        """Store a validated PDF in the configured private bucket."""

        try:
            await to_thread.run_sync(
                lambda: self._client.put_object(
                    self._bucket,
                    object_key,
                    stream,
                    length,
                    content_type="application/pdf",
                )
            )
        except Exception as error:
            raise ObjectStoreError("Unable to store PDF in MinIO") from error

    async def remove(self, object_key: str) -> None:
        """Remove an object after a failed cross-store upload."""

        try:
            await to_thread.run_sync(
                lambda: self._client.remove_object(self._bucket, object_key)
            )
        except Exception as error:
            raise ObjectStoreError("Unable to remove object from MinIO") from error

    async def get_bytes(self, object_key: str) -> bytes:
        """Read a private source object for durable worker processing."""

        def read_object() -> bytes:
            response = self._client.get_object(self._bucket, object_key)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()

        try:
            return await to_thread.run_sync(read_object)
        except Exception as error:
            raise ObjectStoreError("Unable to read PDF from MinIO") from error

    async def is_ready(self) -> bool:
        """Return whether the configured private bucket can be reached."""

        try:
            return await to_thread.run_sync(
                lambda: self._client.bucket_exists(self._bucket)
            )
        except Exception:
            return False
