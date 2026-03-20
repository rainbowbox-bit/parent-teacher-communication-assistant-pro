const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/` +
  `gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

/**
 * Calls the Gemini API with a query and optional system prompt.
 * Throws on HTTP error; returns the raw text response.
 */
export async function callGemini(query, systemPrompt = '你是一位專業的幼教溝通助手。') {
  const payload = {
    contents: [{ parts: [{ text: query }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

/**
 * Parses the combined draft + JSON assessment response from Gemini.
 * Returns { draftText, assessment }.
 */
export function parseDraftResponse(fullResponse) {
  const jsonStart = fullResponse.indexOf('{');
  const jsonEnd = fullResponse.lastIndexOf('}');

  let draftText = fullResponse;
  let assessment = null;

  if (jsonStart !== -1 && jsonEnd !== -1) {
    draftText = fullResponse.substring(0, jsonStart).trim();
    const jsonText = fullResponse.substring(jsonStart, jsonEnd + 1).trim();
    try {
      assessment = JSON.parse(jsonText);
    } catch {
      // Assessment JSON malformed — continue without it
    }
  }

  // Strip any leaked prompt artefacts or markdown syntax
  draftText = draftText
    .replace(/(\*+|\[|【)(回覆生成任務|幼兒園親師|風險評估|JSON 結構|請先輸出|TEXT|結構|---)[^\]】\n]*(\*+|\]|】)/gi, '')
    .replace(/```(json)?\s*/gi, '')
    .replace(/TEXT/g, '')
    .trim();

  return { draftText, assessment };
}
