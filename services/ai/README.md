# AISMOS AI Service

FastAPI service for model orchestration, brand memory retrieval, generation, scoring, and future agent execution.

## Run Locally

```bash
python -m venv .venv
.venv\\Scripts\\pip install -r services/ai/requirements.txt
python -m uvicorn app.main:app --reload --app-dir services/ai
```

Health check:

```bash
curl http://localhost:8000/health
```

