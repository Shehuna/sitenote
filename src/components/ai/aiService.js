export async function summarizeJob(userId, jobId, customPrompt, maxNotes = 10000) {
  const API_URL = process.env.REACT_APP_API_BASE_URL
  const base = `${API_URL}/api/ai/summarize-job`;
  const url = `${base}?jobId=${encodeURIComponent(jobId)}&userId=${encodeURIComponent(
    userId
  )}&customPrompt=${encodeURIComponent(customPrompt)}&maxNotes=${encodeURIComponent(
    maxNotes
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "text/plain, application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI API error: ${res.status} ${text}`);
  }

  // API returns plaintext summary
  const text = await res.text();
  return text;
}

export default { summarizeJob };
