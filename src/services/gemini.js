const API_ROOT = 'https://generativelanguage.googleapis.com/v1';

// Prefer newer flash models first, then gracefully fall back.
const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro',
];

const TIMEOUT_MS = 30_000;
const modelCache = new Map();

function extractErrorMessage(payload) {
  if (!payload) return '';
  return payload?.error?.message || payload?.message || '';
}

function normalizeModelName(name = '') {
  return name.replace(/^models\//, '');
}

async function parseResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchAvailableModels(apiKey, signal) {
  const response = await fetch(`${API_ROOT}/models?key=${apiKey}`, { signal });
  const data = await parseResponseJson(response);
  const errorMessage = extractErrorMessage(data);

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error('INVALID_KEY');
    }
    throw new Error(`LIST_MODELS_FAILED:${response.status}:${errorMessage}`);
  }

  const available = (data?.models || [])
    .filter((m) => m?.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => normalizeModelName(m.name));

  if (!available.length) {
    throw new Error('NO_SUPPORTED_MODEL');
  }

  return available;
}

async function resolveModel(apiKey, signal) {
  const cached = modelCache.get(apiKey);
  if (cached) return cached;

  const availableModels = await fetchAvailableModels(apiKey, signal);
  const selected = MODEL_CANDIDATES.find((name) => availableModels.includes(name)) || availableModels[0];

  modelCache.set(apiKey, selected);
  return selected;
}

async function requestGenerateContent({ apiKey, model, payload, signal }) {
  const response = await fetch(`${API_ROOT}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await parseResponseJson(response);

  if (!response.ok) {
    const errorMessage = extractErrorMessage(data);

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error('INVALID_KEY');
    }
    if (response.status === 404) {
      throw new Error(`MODEL_NOT_FOUND:${model}:${errorMessage}`);
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    throw new Error(`GEMINI_API_ERROR:${response.status}:${errorMessage}`);
  }

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('')
    .trim();

  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`PROMPT_BLOCKED:${blockReason}`);
    }
    throw new Error('EMPTY_RESPONSE');
  }

  return text;
}

/**
 * Calls Gemini with automatic model resolution/fallback for the current API key.
 * Throws 'NO_API_KEY' when key is missing.
 */
export async function callGemini(query, systemPrompt = '你是一位專業的幼教溝通助手。', apiKey = '') {
  if (!apiKey) throw new Error('NO_API_KEY');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const fullText = systemPrompt ? `${systemPrompt}\n\n${query}` : query;
  const payload = {
    contents: [{ parts: [{ text: fullText }] }],
  };

  try {
    let model = await resolveModel(apiKey, controller.signal);

    try {
      return await requestGenerateContent({ apiKey, model, payload, signal: controller.signal });
    } catch (err) {
      // If cached model became unavailable, refresh once and retry automatically.
      if (String(err?.message || '').startsWith('MODEL_NOT_FOUND:')) {
        modelCache.delete(apiKey);
        model = await resolveModel(apiKey, controller.signal);
        return await requestGenerateContent({ apiKey, model, payload, signal: controller.signal });
      }
      throw err;
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
      // Ignore malformed trailing JSON blocks and keep draft text.
    }
  }

  draftText = draftText
    .replace(/```(json)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  return { draftText, assessment };
}
