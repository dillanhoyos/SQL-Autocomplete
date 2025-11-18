from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import autocomplete, health

app = FastAPI(
    title="SQL Autocomplete API",
    description="Natural language SQL autocomplete with AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(autocomplete.router, prefix="/api")
app.include_router(health.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "SQL Autocomplete API", "status": "running"}

