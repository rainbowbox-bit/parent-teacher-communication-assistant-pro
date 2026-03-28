const BASE_URL =
  'https://generativelanguage.googleapis.com/v1/models/' +
  'gemini-2.0-flash:generateContent';

/**
 * Calls the Gemini API with a query and optional system prompt.
 * apiKey must be supplied by the caller (stored in localStorage by the UI).
 * Throws 'NO_API_KEY' when key is missing, or an HTTP error string otherwise.
 */
const TIMEOUT_MS = 20_000;

export async function callGemini(query, systemPrompt = '你是一位專業的幼教溝通助手。', apiKey = '') {
  if (!apiKey) throw new Error('NO_API_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const fullText = systemPrompt ? `${systemPrompt}\n\n${query}` : query;
  const payload = {
    contents: [{ parts: [{ text: fullText }] }],
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('INVALID_KEY');
    }
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
