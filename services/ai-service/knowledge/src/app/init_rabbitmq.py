"""Create the Knowledge vhost and grant one scoped RabbitMQ user."""

import base64
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


def _request(method: str, path: str, body: dict[str, str] | None = None) -> None:
    host = os.environ.get("RABBITMQ_MANAGEMENT_URL", "http://rabbitmq:15672").rstrip("/")
    admin = os.environ["RABBITMQ_USER"]
    password = os.environ["RABBITMQ_PASSWORD"]
    credentials = base64.b64encode(f"{admin}:{password}".encode()).decode()
    request = Request(
        host + path,
        data=json.dumps(body or {}).encode(),
        headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/json"},
        method=method,
    )
    with urlopen(request, timeout=10) as response:
        if response.status not in (200, 201, 204):
            raise RuntimeError(f"RabbitMQ management returned {response.status}")


def run() -> None:
    user = os.environ["KNOWLEDGE_RABBITMQ_USER"]
    password = os.environ["KNOWLEDGE_RABBITMQ_PASSWORD"]
    if not user or not password:
        raise ValueError("Knowledge RabbitMQ credentials are required")
    for attempt in range(30):
        try:
            _request("PUT", "/api/vhosts/knowledge")
            _request("PUT", f"/api/users/{quote(user, safe='')}", {"password": password, "tags": ""})
            _request("PUT", f"/api/permissions/knowledge/{quote(user, safe='')}", {
                "configure": ".*", "write": ".*", "read": ".*",
            })
            return
        except (HTTPError, URLError):
            if attempt == 29:
                raise
            time.sleep(2)


if __name__ == "__main__":
    run()
