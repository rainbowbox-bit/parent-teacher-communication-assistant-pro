import React, { useState, useEffect, useCallback } from 'react';
import { Puzzle, RotateCcw, KeyRound } from 'lucide-react';

import { BRANDING_SIGNATURE_UI, PARENT_STYLES, AGE_GROUPS } from './constants';
import { callGemini, parseDraftResponse } from './services/gemini';
import {
  buildDraftPrompt, buildPolishPrompt,
  buildSimulatePrompt, buildAdminReportPrompt,
  SYSTEM_PROMPT,
} from './services/prompts';

import SettingsPanel from './components/SettingsPanel';
import ResultPanel from './components/ResultPanel';
import ApiKeyModal from './components/ApiKeyModal';

const DEFAULT_FORM = {
  topic: 'care',
  direction: 'reply',
  context: '',
  childName: '',
  role: 'mom',
  customRole: '',
  parentStyle: 'anxious',
  ageGroups: ['middle'],
  mode: 'collaborative',
  time: '',
  tone: 'warm',
  responseLength: 'detailed',
  deadline: '',
};

const LS_KEY = 'gemini_api_key';

function getNowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function App() {
  // API key (persisted in localStorage)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) ?? '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleSaveApiKey = useCallback((key) => {
    if (key) {
      localStorage.setItem(LS_KEY, key);
    } else {
      localStorage.removeItem(LS_KEY);
    }
    setApiKey(key);
  }, []);

  // Form & result state
  const [formData, setFormData] = useState({ ...DEFAULT_FORM, time: getNowTime() });
  const [draft, setDraft] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [simulatedReply, setSimulatedReply] = useState(null);
  const [adminReport, setAdminReport] = useState(null);
  const [history, setHistory] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewMode, setViewMode] = useState('text');

  useEffect(() => {
    setFormData((prev) => ({ ...prev, time: getNowTime() }));
  }, []);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleAgeGroup = useCallback((key) => {
    const ALL_AGE_KEYS = Object.keys(AGE_GROUPS);
    setFormData((prev) => {
      if (key === 'all') {
        const allSelected = ALL_AGE_KEYS.every((k) => prev.ageGroups.includes(k));
        return { ...prev, ageGroups: allSelected ? ['middle'] : [...ALL_AGE_KEYS] };
      }
      const groups = prev.ageGroups;
      if (groups.includes(key)) {
        return groups.length === 1 ? prev : { ...prev, ageGroups: groups.filter((g) => g !== key) };
      }
      return { ...prev, ageGroups: [...groups, key] };
    });
  }, []);

  const handleQuickTag = useCallback((tag) => {
    setFormData((prev) => {
      const parts = (prev.context || '').split('、').map((s) => s.trim()).filter(Boolean);
      const idx = parts.indexOf(tag);
      const next = idx !== -1 ? parts.filter((_, i) => i !== idx) : [...parts, tag];
      return { ...prev, context: next.join('、') };
    });
  }, []);

  const addToHistory = useCallback((text, assess) => {
    setHistory((prev) => [
      { id: Date.now(), timestamp: getNowTime(), text, assessment: assess, childName: formData.childName, context: formData.context },
      ...prev,
    ].slice(0, 3));
  }, [formData.childName, formData.context]);

  // Generate draft
  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    if (!formData.context.trim()) {
      setError('請先輸入要回覆的情境內容。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setDraft(null);
    setAssessment(null);
    setSimulatedReply(null);
    setViewMode('text');

    try {
      const query = buildDraftPrompt(formData);
      const raw = await callGemini(query, SYSTEM_PROMPT, apiKey);
      const { draftText, assessment: parsed } = parseDraftResponse(raw);
      setDraft({ text: draftText });
      setAssessment(parsed);
      addToHistory(draftText, parsed);
    } catch (e) {
      if (e.message === 'NO_API_KEY') {
        setShowApiKeyModal(true);
      } else if (e.message === 'INVALID_KEY') {
        setShowApiKeyModal(true);
        setError('API 金鑰無效、已過期，或未開通 Gemini API 權限，請至 Google AI Studio 重新建立金鑰。');
      } else if (e.message === 'TIMEOUT') {
        setError('請求逾時，請檢查網路後再試。');
      } else if (e.message === 'NO_SUPPORTED_MODEL') {
        setError('此 API 金鑰目前查無可用的 Gemini 文字模型，請到 Google AI Studio 確認專案與 API 啟用狀態。');
      } else if (e.message?.startsWith('MODEL_NOT_FOUND')) {
        setError('目前模型暫時不可用，系統已嘗試自動切換；若仍失敗，請稍後重試或重新建立 API 金鑰。');
      } else if (e.message === 'RATE_LIMITED') {
        setError('請求過於頻繁（超出配額），請稍後再試。');
      } else if (e.message?.startsWith('PROMPT_BLOCKED')) {
        setError('內容觸發模型安全限制，請調整內容後再試。');
      } else {
        const detail = e.message ? `（${e.message}）` : '';
        setError(`生成失敗，請確認 API 金鑰或網路連線。${detail}`);
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [formData, addToHistory, apiKey]);

  // Polish draft
  const handlePolish = useCallback(async (type) => {
    if (!draft) return;
    setIsMagicLoading(true);
    try {
      const query = buildPolishPrompt(draft.text, type);
      const result = await callGemini(query, undefined, apiKey);
      setDraft({ text: result });
      setHistory((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        next[0] = { ...next[0], text: result };
        return next;
      });
    } catch {
      setError('潤稿失敗，請稍後再試。');
    } finally {
      setIsMagicLoading(false);
    }
  }, [draft, apiKey]);

  // Simulate parent reply
  const handleSimulate = useCallback(async () => {
    if (!draft) return;
    setIsMagicLoading(true);
    setSimulatedReply(null);
    try {
      const ps = PARENT_STYLES[formData.parentStyle];
      const query = buildSimulatePrompt(draft.text, ps.name, ps.instruction);
      const result = await callGemini(query, undefined, apiKey);
      setSimulatedReply(result);
    } catch {
      setError('模擬家長回覆失敗，請稍後再試。');
    } finally {
      setIsMagicLoading(false);
    }
  }, [draft, formData.parentStyle, apiKey]);

  // Admin report
  const handleAdminReport = useCallback(async () => {
    if (!formData.context) return;
    setIsAdminLoading(true);
    setAdminReport(null);
    setShowAdminModal(true);
    try {
      const query = buildAdminReportPrompt(formData);
      const result = await callGemini(query, '你是一位專業的幼兒園行政主管，擅長撰寫客觀的事件報告。', apiKey);
      setAdminReport(result);
    } catch {
      setAdminReport('生成失敗，請稍後再試。');
    } finally {
      setIsAdminLoading(false);
    }
  }, [formData, apiKey]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text) => {
    const finish = () => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(() => {
        // fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        finish();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finish();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm('確定要重設所有欄位與結果嗎？')) return;
    setFormData({ ...DEFAULT_FORM, time: getNowTime() });
    setDraft(null);
    setAssessment(null);
    setSimulatedReply(null);
    setAdminReport(null);
    setShowAdminModal(false);
    setError(null);
  }, []);

  const hasApiKey = Boolean(apiKey);

  return (
    <div className="min-h-screen font-sans text-gray-800 pb-20 bg-[#f0f9ff]">
      <div className="fixed inset-0 bg-pattern pointer-events-none z-0" />

      {/* Header */}
      <header className="glass-header border-b border-teal-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-gradient-to-br from-teal-400 to-sky-500 p-2 rounded-xl text-white shadow-lg">
              <Puzzle size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">親師溝通助手 PRO</h1>
              <p className="text-[10px] text-teal-600 uppercase tracking-wider font-semibold">
                Preschool Professional V11
              </p>
            </div>
          </div>

          <div className="hidden md:block flex-1 text-center border-l border-r border-teal-50 mx-4 px-4">
            <p className="text-[10px] text-gray-400 italic leading-tight">
              AI 僅為輔助工具，請依實際情況調整內容。<br />
              送出前請再次確認語氣、時間與承諾事項。<br />
              涉及安全或行政事件時，建議同步通報主管。
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {/* API Key button - orange when missing, teal when set */}
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                hasApiKey
                  ? 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100'
                  : 'bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-100 animate-pulse'
              }`}
              title={hasApiKey ? `已設定金鑰 (...${apiKey.slice(-4)})` : '請先設定 API 金鑰才能使用'}
            >
              <KeyRound size={14} />
              {hasApiKey ? 'API 金鑰' : '設定金鑰 ！'}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
            >
              <RotateCcw size={14} /> 重設
            </button>
            <div className="hidden sm:block text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
              園所專業版
            </div>
          </div>
        </div>

        <div className="md:hidden px-4 pb-2 text-center">
          <p className="text-[10px] text-gray-400 italic leading-relaxed">
            AI 僅為輔助工具，請依實際情況調整內容。<br />
            送出前請再次確認語氣、時間與承諾事項。<br />
            涉及安全或行政事件時，建議同步通報主管。
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <div className="lg:col-span-7">
          <SettingsPanel
            formData={formData}
            onChange={handleChange}
            onToggleAge={toggleAgeGroup}
            onQuickTag={handleQuickTag}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            error={error}
            hasApiKey={hasApiKey}
          />
        </div>

        <div className="lg:col-span-5">
          <ResultPanel
            draft={draft}
            assessment={assessment}
            simulatedReply={simulatedReply}
            adminReport={adminReport}
            history={history}
            isLoading={isLoading}
            isMagicLoading={isMagicLoading}
            isAdminLoading={isAdminLoading}
            showAdminModal={showAdminModal}
            viewMode={viewMode}
            formData={formData}
            copySuccess={copySuccess}
            onSetDraft={setDraft}
            onSetAssessment={setAssessment}
            onPolish={handlePolish}
            onSimulate={handleSimulate}
            onAdminReport={handleAdminReport}
            onCloseAdminModal={() => setShowAdminModal(false)}
            onCopy={copyToClipboard}
            onSetViewMode={setViewMode}
          />
        </div>
      </main>

      <footer className="w-full text-center py-4 text-[10px] text-gray-400 relative z-10">
        {BRANDING_SIGNATURE_UI}
      </footer>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          currentKey={apiKey}
          onSave={handleSaveApiKey}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
}
