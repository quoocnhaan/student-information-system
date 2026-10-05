# AI Service

Backend workspace for AI capabilities in the Student Information System.

## Knowledge API

`knowledge/` is an independently runnable FastAPI service. It will own
document ingestion, indexing, and retrieval. The public interface currently
provides operational endpoints only:

- `GET /health` — process liveness
- `GET /ready` — readiness for traffic

Run it locally:

```bash
cd services/ai-service/knowledge
python -m pip install -e ".[dev]"
uvicorn app.main:app --app-dir src --reload
```

The future `agent/` directory is intentionally empty. It will consume the
knowledge service through its HTTP interface rather than importing knowledge
implementation details.
