# backend/app/api/query.py
from fastapi import APIRouter, HTTPException
from app.schemas.query_schema import QueryRequest, QueryResponse
from app.workers.tasks import enqueue_job

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def create_query(req: QueryRequest):
    if not req.item:
        raise HTTPException(status_code=400, detail="Item required")

    job_id = enqueue_job(req.item)
    return QueryResponse(job_id=job_id)
