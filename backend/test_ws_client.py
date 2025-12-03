# backend/test_ws_client.py
import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as ws:
        job_id = "test-join-" + "1234"
        await ws.send(json.dumps({"type":"join", "job_id": job_id}))
        print("joined", job_id)
        # read a few messages
        for _ in range(20):
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=10)
                print("RECV:", msg)
            except asyncio.TimeoutError:
                break

asyncio.run(test())
