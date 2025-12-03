# backend/app/workers/tasks.py
import uuid
import logging
import asyncio

from app.services.llm_service import get_factors
from app.api.websocket import broadcast_partial, broadcast_final

log = logging.getLogger("backend")

JOBS = {}  # memory store


def enqueue_job(item: str):
    job_id = str(uuid.uuid4())
    log.info(f"🔥 NEW JOB: {job_id} - {item}")

    JOBS[job_id] = {"item": item}
    asyncio.create_task(process_job(job_id, item))

    return job_id


async def process_job(job_id: str, item: str):
    log.info(f"🤖 Processing job {job_id} item: {item}")

    factors = get_factors(item)

    # stream one by one
    for f in factors:
        await broadcast_partial(job_id, f)
        await asyncio.sleep(0.15)

    await broadcast_final(job_id, factors)
    log.info(f"✅ Job finished: {job_id}")
