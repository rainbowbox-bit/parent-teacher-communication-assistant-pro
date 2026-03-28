import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ExternalLink, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';

const STEPS = [
  { step: '1', text: '前往 Google AI Studio 申請免費金鑰' },
  { step: '2', text: '登入 Google 帳號後，點選「Create API key」' },
  { step: '3', text: '複製金鑰，貼到下方欄位並儲存' },
];

export default function ApiKeyModal({ currentKey, onSave, onClose }) {
  const [input, setInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const maskedKey = currentKey
    ? `...${currentKey.slice(-4)}`
    : null;

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const handleClear = () => {
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="modal-animate bg-white rounded-2xl shadow-2xl w-full max-w-md border border-teal-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <KeyRound size={18} className="text-teal-500" />
            設定 Gemini API 金鑰
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Current key status */}
          {currentKey && (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-teal-700 font-medium min-w-0 flex-1 mr-3">
                <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0" />
                <span className="truncate">目前已設定金鑰（末四碼：<span className="font-mono font-bold">{maskedKey}</span>）</span>
              </div>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold transition-colors"
              >
                <Trash2 size={13} /> 清除
              </button>
            </div>
          )}

          {/* Tutorial */}
          <div className="bg-sky-50 rounded-xl border border-sky-100 p-4">
            <p className="text-xs font-bold text-sky-700 uppercase mb-3 tracking-wide">金鑰申請教學</p>
            <ol className="space-y-2.5">
              {STEPS.map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step}
                  </span>
                  <span className="text-sm text-sky-800">{text}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <ExternalLink size={13} />
              前往 Google AI Studio 申請金鑰（免費）
            </a>
          </div>

          {/* Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
              {currentKey ? '輸入新金鑰以取代目前設定' : '貼上您的 API 金鑰'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIza..."
                className="w-full p-3 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
            <ShieldCheck size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
            金鑰僅儲存於您的瀏覽器本機（localStorage），不會傳送至任何伺服器，您的費用完全自主掌控。
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!input.trim() || saved}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-500 text-white'
                : input.trim()
                ? 'bg-gradient-to-r from-teal-400 to-sky-500 text-white hover:from-teal-500 hover:to-sky-600 shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saved ? <><CheckCircle2 size={15} /> 已儲存！</> : <><KeyRound size={15} /> 儲存並使用</>}
          </button>
        </div>
      </div>
    </div>
  );
}
