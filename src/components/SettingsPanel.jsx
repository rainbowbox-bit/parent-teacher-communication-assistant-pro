import React from 'react';
import {
  Settings, Baby, ChevronDown, Clock, ThermometerSun,
  Ruler, User, Calendar, Zap, Loader,
} from 'lucide-react';
import {
  AGE_GROUPS, MODES, PARENT_STYLES, TOPICS,
  QUICK_SCENARIOS, QUICK_TAGS, CARE_TAGS_BY_AGE,
} from '../constants';

function getCurrentQuickTags(topic, ageGroups) {
  if (topic === 'care') {
    const tags = ageGroups.flatMap((k) => CARE_TAGS_BY_AGE[k] ?? []);
    return [...new Set(tags)];
  }
  return QUICK_TAGS[topic] ?? [];
}

export default function SettingsPanel({
  formData, onChange, onToggleAge, onQuickTag, onGenerate, isLoading, error,
}) {
  const { topic, direction, context, role, customRole, parentStyle,
          ageGroups, mode, time, tone, responseLength, deadline, childName } = formData;

  const quickTags = getCurrentQuickTags(topic, ageGroups);

  return (
    <div className="glass-card rounded-2xl shadow-xl border border-teal-100 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-gray-800 font-bold text-base mb-5 border-b border-gray-100 pb-3">
        <Settings size={18} className="text-teal-500" />
        <h2>情境參數設定</h2>
      </div>

      {/* 1. Age Groups */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
          <Baby size={14} /> 班級年齡層 (可複選)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(AGE_GROUPS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => onToggleAge(key)}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all border ${
                ageGroups.includes(key)
                  ? 'bg-teal-500 text-white border-teal-600 shadow-md'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {val.name.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Topic & Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">溝通情境</label>
          <div className="relative">
            <select
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none text-sm font-medium appearance-none"
              value={topic}
              onChange={(e) => onChange('topic', e.target.value)}
            >
              {Object.entries(TOPICS).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">訊息方向</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {[['reply', '回應家長'], ['notify', '主動通報']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => onChange('direction', val)}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                  direction === val ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Deadline (activity only) */}
      {topic === 'activity' && (
        <div className="mb-5 bg-teal-50/50 p-3 rounded-lg border border-teal-100">
          <label className="block text-xs font-semibold text-teal-700 uppercase mb-1.5 flex items-center gap-1">
            <Calendar size={14} /> 物品攜帶/繳交截止日 (選填)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="例如：明天早上、本週五前、10/25"
              className="flex-1 p-2 bg-white border border-teal-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400"
              value={deadline}
              onChange={(e) => onChange('deadline', e.target.value)}
            />
            {['明天早上', '下週一'].map((d) => (
              <button key={d} onClick={() => onChange('deadline', d)}
                className="px-3 py-1 bg-white text-xs border border-teal-200 rounded hover:bg-teal-100 transition-colors">
                {d === '明天早上' ? '明天' : '下週一'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Context & Quick Tags */}
      <div className="mb-5">
        <div className="flex justify-between items-end mb-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase">
            {direction === 'reply' ? '家長訊息 / 關鍵狀況' : '幼生狀況描述'}
          </label>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide max-w-[200px]">
            {QUICK_SCENARIOS.map((s, i) => (
              <button
                key={i}
                onClick={() => onChange('context', s.text)}
                className="text-[10px] bg-sky-50 text-sky-600 px-2 py-1 rounded border border-sky-100 whitespace-nowrap hover:bg-sky-100"
                title={s.text}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {quickTags.map((tag) => {
            const isSelected = context.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onQuickTag(tag)}
                className={`text-xs px-2 py-1 rounded-md border transition-all ${
                  isSelected
                    ? 'bg-teal-500 text-white border-teal-600 shadow-sm font-bold'
                    : 'bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}{tag}
              </button>
            );
          })}
        </div>

        <textarea
          className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-400 min-h-[100px] resize-none outline-none text-sm"
          placeholder={direction === 'reply'
            ? '例如：媽媽Line說孩子最近去醫院評估，報告出來了...'
            : '例如：今天午餐有吃光光，但午睡比較晚睡著...'}
          value={context}
          onChange={(e) => onChange('context', e.target.value)}
        />
      </div>

      {/* 5. Child Name, Parent Style, Role */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
            <User size={12} /> 孩子暱稱 (選填)
          </label>
          <input
            type="text"
            placeholder="例如：樂樂、小星星"
            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400"
            value={childName}
            onChange={(e) => onChange('childName', e.target.value)}
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">家長類型</label>
          <div className="relative">
            <select
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none appearance-none"
              value={parentStyle}
              onChange={(e) => onChange('parentStyle', e.target.value)}
            >
              {Object.entries(PARENT_STYLES).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">對象</label>
          <div className="relative">
            <select
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none appearance-none"
              value={role}
              onChange={(e) => onChange('role', e.target.value)}
            >
              <option value="mom">媽媽</option>
              <option value="dad">爸爸</option>
              <option value="grandparent">阿公/阿嬤</option>
              <option value="generic">家長</option>
              <option value="custom">自訂稱謂...</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {role === 'custom' && (
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">輸入稱謂</label>
            <input
              type="text"
              placeholder="例如：保母阿姨、姑姑"
              className="w-full p-2 bg-white border border-teal-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400"
              value={customRole}
              onChange={(e) => onChange('customRole', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 6. Time, Tone, Length */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
            <Clock size={12} /> 時間
          </label>
          <input
            type="time"
            className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm text-center"
            value={time}
            onChange={(e) => onChange('time', e.target.value)}
          />
        </div>

        {[
          { label: '語氣', icon: ThermometerSun, field: 'tone', options: [['warm', '溫暖'], ['formal', '堅定']] },
          { label: '長度', icon: Ruler, field: 'responseLength', options: [['detailed', '詳細'], ['concise', '簡潔']] },
        ].map(({ label, icon: Icon, field, options }) => (
          <div key={field}>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
              <Icon size={12} /> {label}
            </label>
            <div className="flex bg-gray-100 p-1 rounded-lg h-[38px]">
              {options.map(([val, text]) => (
                <button
                  key={val}
                  onClick={() => onChange(field, val)}
                  className={`flex-1 rounded text-xs font-medium transition-all ${
                    formData[field] === val ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 7. Modes */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">溝通策略模式</label>
        <div className="grid grid-cols-1 gap-3">
          {Object.values(MODES).map((m) => {
            const Icon = m.icon;
            const isSelected = mode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => onChange('mode', m.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected ? `${m.color} border-current shadow-sm` : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white bg-opacity-50' : 'bg-gray-100'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{m.name}</div>
                  <div className="text-xs opacity-80 mt-0.5">{m.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className={`w-full text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
          isLoading
            ? 'bg-gray-400'
            : 'bg-gradient-to-r from-teal-400 to-sky-500 hover:from-teal-500 hover:to-sky-600 active:scale-[0.98]'
        }`}
      >
        {isLoading ? <Loader size={20} className="animate-spin" /> : <Zap size={20} className="fill-current" />}
        {isLoading ? '幼教小幫手思考中...' : '生成專業回覆'}
      </button>

      {error && <div className="mt-3 text-red-500 text-sm text-center">{error}</div>}
    </div>
  );
}
