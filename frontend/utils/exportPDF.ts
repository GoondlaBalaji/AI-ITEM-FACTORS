export async function exportPDF(html: string) {
  const res = await fetch("http://localhost:5000/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });

  if (!res.ok) return alert("PDF export failed");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AI_Item_Factors_Report.pdf";
  a.click();
}
