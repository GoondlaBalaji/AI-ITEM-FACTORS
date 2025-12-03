import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws"   # ✅ FIXED
    print("Connecting to backend WS:", uri)

    async with websockets.connect(uri) as ws:
        print("Connected!")

        await ws.send(json.dumps({
            "type": "join",
            "job_id": "test-123"
        }))

        while True:
            msg = await ws.recv()
            print("Received:", msg)

asyncio.run(test())
