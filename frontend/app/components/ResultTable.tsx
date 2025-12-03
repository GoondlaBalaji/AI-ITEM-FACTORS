import { exportPDF } from "../../utils/exportPDF";

// ADD THIS NEAR BOTTOM (below chart)
<button
  onClick={() => {
    const reportHTML = document.getElementById("report-area")?.innerHTML || "";
    exportPDF(reportHTML);
  }}
  className="px-4 py-2 mt-4 font-semibold text-white bg-blue-500 rounded hover:bg-blue-600"
>
  Download PDF
</button>
