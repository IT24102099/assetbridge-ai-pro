from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from config.settings import get_settings

settings = get_settings()

app = FastAPI(
    title="AssetBridge AI — Internal Agentic AI Service",
    description="Internal agent orchestration, controlled tool execution, and proposal validation service.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5206", "http://127.0.0.1:5206"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": "AssetBridge-AI-Service",
        "status": "Running",
        "governance_rule": "AI recommends -> Backend validates -> Human approves -> Backend executes -> Audit records"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
