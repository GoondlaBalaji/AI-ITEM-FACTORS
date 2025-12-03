// frontend/utils/api.ts
export type CreateJobResp = { job_id?: string; error?: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").trim();

export async function queryItem(item: string): Promise<CreateJobResp> {
  try {
    const url = `${API_BASE.replace(/\/$/, "")}/api/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("❌ queryItem server error:", res.status, txt);
      return { error: `server ${res.status}` };
    }

    return (await res.json()) as CreateJobResp;
  } catch (err) {
    console.error("❌ queryItem network error:", err);
    return { error: "network" };
  }
}
