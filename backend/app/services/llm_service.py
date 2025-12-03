# backend/app/services/llm_service.py
import os, json, logging
from groq import Groq
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

log = logging.getLogger("llm")

API_KEY = os.getenv("GROQ_API_KEY")
if not API_KEY:
    raise RuntimeError("❌ GROQ_API_KEY missing in backend/.env")

client = Groq(api_key=API_KEY)

PROMPT = """
Return EXACT JSON ARRAY of 10 factors for the given item.
Each item MUST be:
{
 "rank": number,
 "name": string,
 "effect_short": string,
 "direction": "increases" | "slightly_increases" | "decreases"
}
NO text outside JSON.
"""

def get_factors(item: str):
    log.info(f"Querying Groq for: {item}")

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # supported model
        messages=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": f"Generate factors for: {item}"}
        ],
        temperature=0.2
    )

    raw = resp.choices[0].message.content  # ✔ FIXED
    log.info(f"Groq raw output: {raw}")

    # Try JSON parse
    try:
        return json.loads(raw)
    except:
        pass

    # Try extracting array
    try:
        start = raw.index("[")
        end = raw.rindex("]") + 1
        return json.loads(raw[start:end])
    except:
        log.error("❌ Failed to parse Groq JSON")
        return []