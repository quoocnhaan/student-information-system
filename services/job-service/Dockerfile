FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN python -m pip install --no-cache-dir .
COPY db ./db
CMD ["uvicorn", "job_service.main:app", "--host", "0.0.0.0", "--port", "8010"]
