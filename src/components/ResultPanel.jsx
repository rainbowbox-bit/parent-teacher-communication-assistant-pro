import React from 'react';
import {
  Loader, Star, FileText, Smartphone, Copy, CheckCircle2,
  AlertCircle, Wand2, Shield, MessageCircle, ClipboardList,
  History, User, Puzzle, X,
} from 'lucide-react';
import { PARENT_STYLES } from '../constants';

function StarRating({ score }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < Math.floor(score) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

function Assessment({ assessment }) {
  if (!assessment) return null;
  const isHigh = assessment.risk.level === '高';
  return (
    <div className={`mb-4 p-3 rounded-lg border text-xs ${isHigh ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex justify-between items-center mb-1 font-bold">
        <span className="flex items-center gap-1">
          <AlertCircle size={14} /> 風險評估：{assessment.risk.level}
        </span>
        <StarRating score={assessment.rating.score} />
      </div>
      <ul className="list-disc list-inside text-gray-600 space-y-1">
        {assessment.risk.adjustment_advice.slice(0, 2).map((adv, i) => (
          <li key={i}>{adv}</li>
        ))}
      </ul>
    </div>
  );
}

function HistoryList({ history, onRestore }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-white">
      <div className="text-center text-gray-400 mb-4 flex items-center justify-center gap-2 text-sm">
        <History size={16} /> 最近生成紀錄
      </div>
      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-teal-200 transition-all cursor-pointer group relative"
            onClick={() => onRestore(item)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">
                {item.childName || '孩子'}
              </span>
              <span className="text-[10px] text-gray-400">{item.timestamp}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-3">{item.text}</p>
            <div className="mt-2 text-[10px] text-gray-400 truncate">情境：{item.context}</div>
            <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white/50">
      <Puzzle size={48} className="text-teal-200 mb-4" />
      <p className="text-sm">每個孩子都是獨特的拼圖<br />讓我協助您與家長建立信任與希望</p>
    </div>
  );
}

function AdminModal({ adminReport, isAdminLoading, onClose, onCopy }) {
  return (
    <div className="absolute inset-0 bg-white/95 z-50 flex flex-col p-5 modal-animate">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={18} /> 行政通報預覽
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {isAdminLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <Loader className="animate-spin text-gray-600" size={30} />
          <p className="text-xs text-gray-500">正在撰寫公文格式...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 font-mono">
          {adminReport}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => { onCopy(adminReport); onClose(); }}
          disabled={isAdminLoading}
          className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold shadow hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
        >
          <Copy size={16} /> 複製內容並關閉
        </button>
      </div>
    </div>
  );
}

export default function ResultPanel({
  draft, assessment, simulatedReply, adminReport, history,
  isLoading, isMagicLoading, isAdminLoading, showAdminModal,
  viewMode, formData, copySuccess,
  onSetDraft, onSetAssessment, onPolish, onSimulate,
  onAdminReport, onCloseAdminModal, onCopy, onSetViewMode,
}) {
  const showHistory = !draft && !isLoading && history.length > 0;
  const showEmpty   = !draft && !isLoading && history.length === 0;

  return (
    <div className="glass-card rounded-2xl shadow-xl border border-teal-100 flex flex-col h-[600px] sticky top-24 overflow-hidden relative">
      {showHistory && (
        <HistoryList
          history={history}
          onRestore={(item) => { onSetDraft({ text: item.text }); onSetAssessment(item.assessment); }}
        />
      )}

      {showEmpty && <EmptyState />}

      {(draft || isLoading) && (
        <div className="flex-1 overflow-y-auto p-5 bg-white flex flex-col">
          <Assessment assessment={assessment} />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-3 flex-1">
              <Loader className="animate-spin text-teal-500" size={30} />
              <p className="text-xs text-gray-500">正在撰寫溫暖的回覆...</p>
            </div>
          ) : (
            <>
              {/* View toggle */}
              <div className="flex justify-end mb-2">
                <div className="bg-gray-100 p-1 rounded-lg flex">
                  {[['text', FileText, '文字模式'], ['line', Smartphone, 'LINE 預覽']].map(([val, Icon, title]) => (
                    <button
                      key={val}
                      onClick={() => onSetViewMode(val)}
                      title={title}
                      className={`p-1.5 rounded-md transition-all ${
                        viewMode === val
                          ? `bg-white shadow ${val === 'line' ? 'text-green-600' : 'text-teal-600'}`
                          : 'text-gray-400'
                      }`}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Draft content */}
              <div className="relative group flex-1">
                {viewMode === 'line' ? (
                  <div className="bg-slate-200 p-4 rounded-xl min-h-[300px]">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">師</div>
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div className="text-[10px] text-gray-500">老師</div>
                        <div className="line-bubble text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {draft?.text}
                        </div>
                      </div>
                      <div className="self-end text-[10px] text-gray-500 mb-1">{formData.time}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px] min-h-[300px]">
                    {draft?.text}
                  </div>
                )}

                <button
                  onClick={() => onCopy(draft.text)}
                  className="absolute top-12 right-4 p-1.5 bg-white/80 backdrop-blur rounded-md shadow-sm border border-gray-100 text-gray-400 hover:text-teal-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </>
          )}

          {/* Action buttons */}
          {draft && !isLoading && (
            <div className="mt-4 space-y-3 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onPolish('soften')}
                  disabled={isMagicLoading}
                  className="flex items-center justify-center gap-1.5 py-2 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors"
                >
                  <Wand2 size={14} /> 更溫柔委婉
                </button>
                <button
                  onClick={() => onPolish('firm')}
                  disabled={isMagicLoading}
                  className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  <Shield size={14} /> 更堅定專業
                </button>
              </div>

              <button
                onClick={onSimulate}
                disabled={isMagicLoading}
                className="w-full py-2.5 border-2 border-dashed border-teal-200 text-teal-600 rounded-lg text-xs font-bold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
              >
                {isMagicLoading ? <Loader size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                模擬{PARENT_STYLES[formData.parentStyle].name.split(' ')[0]}的回覆
              </button>

              <button
                onClick={onAdminReport}
                disabled={isAdminLoading}
                className="w-full py-2.5 bg-gray-800 text-gray-200 rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {isAdminLoading ? <Loader size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                生成行政通報紀錄 (園長存查)
              </button>

              {simulatedReply && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400 text-xs text-gray-600">
                  <div className="font-bold mb-1 text-gray-800 flex items-center gap-1">
                    <User size={12} /> 家長可能回覆：
                  </div>
                  {simulatedReply}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin modal overlay */}
      {showAdminModal && (
        <AdminModal
          adminReport={adminReport}
          isAdminLoading={isAdminLoading}
          onClose={onCloseAdminModal}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}
