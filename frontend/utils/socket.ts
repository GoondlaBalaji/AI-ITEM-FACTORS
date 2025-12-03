// frontend/utils/socket.ts

export type WSMessage = {
  type: string;
  data: any;
};

let socket: WebSocket | null = null;
let activeJobId: string | null = null;

export function connectWS(
  jobId: string,
  onMessage: (msg: WSMessage) => void
): () => void {
  const WS_URL =
    (process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws").trim();

  // Close previous socket
  if (socket) {
    try { socket.close(); } catch {}
    socket = null;
    activeJobId = null;
  }

  console.log("🔌 Connecting WebSocket →", WS_URL);

  socket = new WebSocket(WS_URL);
  activeJobId = jobId;

  socket.onopen = () => {
    console.log("🟢 WS connected, joining job:", jobId);
    socket?.send(JSON.stringify({ type: "join", job_id: jobId }));
  };

  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      onMessage(msg);
    } catch (err) {
      console.error("❌ WS parse error:", err);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("🔴 WS closed");
  };

  return () => {
    try { socket?.close(); } catch {}
    socket = null;
    activeJobId = null;
  };
}
