# backend/app/services/item_service.py
from .llm_service import generate_factors

async def analyze_item(item: str):
    factors = await generate_factors(item)
    return factors
