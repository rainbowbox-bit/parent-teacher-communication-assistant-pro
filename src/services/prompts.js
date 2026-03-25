import {
  MODES, TOPICS, PARENT_STYLES, AGE_GROUPS,
  WARM_CLOSINGS, FORMAL_CLOSINGS, BRANDING_SIGNATURE_TEXT,
} from '../constants';

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGreetingText(role, customRole, timeStr) {
  const hour = parseInt(timeStr.split(':')[0], 10);
  let timeGreeting = '日安';
  if (hour < 11) timeGreeting = '早安';
  else if (hour < 14) timeGreeting = '午安';
  else if (hour < 18) timeGreeting = '下午好';
  else timeGreeting = '晚安';

  const roleMap = {
    mom: '媽媽',
    dad: '爸爸',
    grandparent: '阿公/阿嬤',
    guardian: '家長',
    generic: '家長',
    custom: customRole || '家長',
  };
  return `${roleMap[role]} ${timeGreeting}`;
}

export const SYSTEM_PROMPT = `你是一位擁有 20 年資深經驗、充滿愛心、細心且極具**幼教與特教雙專業素養**的幼兒園導師。
**核心理念**：保教並重。溝通充滿接納、溫暖與專業指引。
**風格指令**：
1. 繁體中文，台灣用語。
2. **完全去除 AI 味**：禁止使用「首先/其次/總之」、「顯而易見」、「我們需要」等翻譯腔。語氣要像真人平時用 LINE 溝通一樣自然、流暢、有溫度。
3. **禁止使用 Markdown 格式**：絕對不要使用粗體 (** text **)、標題 (#)、清單符號 (- )。請使用自然的段落分行。
**關鍵詞彙**：稱呼學生為「寶貝」、「孩子」或使用者提供的暱稱。
**輸出格式**：兩部分：1. 回覆草稿 (TEXT) 2. 風險評估 (JSON)。`;

export function buildDraftPrompt(formData) {
  const {
    topic, direction, context, role, customRole, mode,
    time, tone, parentStyle, responseLength, ageGroups, deadline, childName,
  } = formData;

  const greetingText = getGreetingText(role, customRole, time);
  const modeDetails = MODES[mode];
  const closingPhrase = (mode === 'admin' || tone === 'formal')
    ? randomPick(FORMAL_CLOSINGS)
    : randomPick(WARM_CLOSINGS);
  const parentStyleDetails = PARENT_STYLES[parentStyle];
  const selectedAgeGroups = ageGroups.map((k) => AGE_GROUPS[k]);
  const ageGroupNames = selectedAgeGroups.map((g) => g.name.split(' ')[1]).join('、');
  const ageGroupFocus = selectedAgeGroups.map((g) => g.focus).join('；');

  const lengthInstruction = responseLength === 'concise'
    ? '【回覆長度要求】：請生成**極度簡潔、不超過 5 行**的重點回覆。'
    : '【回覆長度要求】：請生成**詳細、溫暖且充滿細節**的回覆，約 8-12 行，這對幼兒家長很重要。';

  // ── Professional instructions (assembled conditionally) ──
  let professional = `
【班級年齡層】：${ageGroupNames}。請根據這些年齡層的發展特質（${ageGroupFocus}）來分享觀察細節。若包含不同年齡層，請兼顧不同階段的需求。

【照片建議】：請在回覆中展現對孩子的細膩觀察，並**務必**在回覆的最末端（結尾貼心話之後），加上一行：(建議附照：[描述一張最能傳遞此情境溫度的照片])。
`;

  if (childName) {
    professional += `\n【高度客製化】：請在回覆中多次使用孩子的暱稱「${childName}」來稱呼孩子，**完全取代**「孩子」或是「寶貝」這些通用詞。`;
  }

  if (topic === 'activity' && deadline) {
    professional += `\n【物品攜帶期限】：請務必在回覆中明確提醒家長，請於「${deadline}」前讓孩子帶回學校/準備好物品，語氣要溫柔堅定，並感謝家長的配合。`;
  }

  if (role === 'grandparent') {
    professional += `\n【隔代教養模式】：對象是阿公阿嬤。請使用更口語、親切、白話的台式國語風格。重點放在「孫子有吃飽、穿暖、很乖、老師有在顧」，避免艱澀的教育術語。`;
  }

  const isCrisis = /受傷|咬人|打人|被打|流血|推人/.test(context);
  if (isCrisis) {
    professional += `
【危機處理 SOP】：此情境涉及受傷或衝突，請依照以下 4A 原則回應：
1. Apology (遺憾/心疼)：對孩子受傷感到不捨。
2. Action (處置)：具體說明當下的處理（冰敷、擦藥、安撫）。
3. Analysis (原因)：客觀說明發生經過（非故意、還在學習控制力道）。
4. Adjustment (預防)：未來會如何預防。`;
  }

  if (topic === 'special_ed') {
    professional += `\n【特教專業強化】：\n1. 請著重於「微小的進步」與「優勢觀點」。\n2. 強調融合教育中的正向互動。\n3. 避免標籤，使用生活化描述代替專業術語。`;
  } else if (topic === 'transition') {
    professional += `\n【幼小銜接強化】：用輕鬆鼓勵的方式，分享孩子一點一滴的進步，讓家長對上小學充滿信心，不要製造焦慮。`;
  } else if (topic === 'curriculum') {
    professional += `\n【重點提示】：請聚焦在孩子於活動中「眼睛發亮」的時刻，或是有趣的具體反應，讓家長感受到孩子快樂學習的過程，避免過度解釋教育理論。`;
  }

  if (mode === 'precise') {
    professional += `\n【事實與行動模式強化】：\n1. 結構要求：ORID (客觀事實 -> 感受反應 -> 意義解釋 -> 決定行動)。\n2. 語氣要求：極度客觀、冷靜、不帶情緒評價。`;
  }

  const assessmentQuery = `
[風險評估任務]
請根據您剛才生成的完整回覆草稿（文本），嚴格執行風險評估。
請輸出一個單一的 JSON 物件 (繁體中文)：
\`\`\`json
{
  "rating": {
    "score": <數字 1-5>,
    "reason": "<簡短說明評分原因>"
  },
  "risk": {
    "level": "<低/中/高>",
    "potential_issues": ["<潛在風險點1>", "<潛在風險點2或填無>"],
    "adjustment_advice": ["<建議微調1>", "<建議微調2或填無>"]
  }
}
\`\`\`
`;

  return `
[幼兒園親師回覆生成任務]
請根據以下參數，生成一份給幼兒家長的回覆草稿。
---
**參數與內容：**
1. **問候語 (必填)：** ${greetingText}
2. **訊息方向：** ${direction === 'reply' ? '回應家長訊息' : '主動通報狀況'}
3. **溝通情境與內容：** - 情境主題：${TOPICS[topic].name}
   - 描述："${context}"
4. **回覆語氣：** ${tone === 'warm' ? '像媽媽一樣溫暖親切、富有同理心。' : '專業幼教立場、客觀冷靜、界線明確。'}
5. **家長類型應對：** ${parentStyleDetails.instruction}
6. **長度要求：** ${lengthInstruction}
7. **策略框架：** - **策略名稱：** ${modeDetails.name}
   - **策略說明：** ${modeDetails.desc}
8. **特殊指令 (包含年齡層、暱稱與專業賦能)：** ${professional}
9. **結尾貼心話：** ${closingPhrase} ${BRANDING_SIGNATURE_TEXT}
**任務：** 扮演資深幼教老師，將情境轉化為最有溫度、自然且專業的繁體中文回覆。重點在於「同理家長」與「描述孩子具體狀況」，而不是引用抽象教育理論。請使用「純文字」輸出，像在打 LINE 一樣自然分段即可。
---

[請先輸出回覆草稿，接著輸出 JSON 風險評估]${assessmentQuery}
`;
}

export function buildPolishPrompt(originalText, type) {
  const instructions = {
    soften: '請將這段回覆修改得**更委婉、更溫柔、更有同理心**，多使用緩衝詞，讓焦慮的家長讀了能感到安心。保持原意不變。',
    firm:   '請將這段回覆修改得**更堅定、更專業、立場更清晰**，去除過多的情感贅字，強調幼兒園的規範與集體利益。保持原意不變。',
    shorter:'請將這段回覆**大幅縮減長度**，只保留核心重點，適合忙碌家長快速閱讀。',
  };
  return `
[AI 潤飾任務]
原始回覆內容：
"${originalText}"
潤飾指令：${instructions[type]}

請直接輸出潤飾後的新回覆內容即可，不需要解釋，也不要 JSON。
`;
}

export function buildSimulatePrompt(draftText, parentStyle, parentStyleInstruction) {
  return `
[角色扮演任務]
你現在是一位「${parentStyle}」的幼兒園家長。
老師剛傳給你以下訊息：
"${draftText}"
請根據你的性格設定（${parentStyleInstruction}），模擬你會如何回覆這則訊息。
回覆要真實、符合人性，可能包含擔心、感謝、防衛或追問細節。
請直接輸出家長的回覆內容。
`;
}

export function buildAdminReportPrompt(formData) {
  const { childName, ageGroups, context, topic, time } = formData;
  const childLabel = childName || '幼生';
  const dateStr = new Date().toLocaleDateString('zh-TW');
  const ageGroupNames = ageGroups.map((k) => AGE_GROUPS[k]?.name.split(' ')[1] ?? k).join('、');
  return `
[行政通報生成任務]
請根據以下情境，撰寫一份供幼兒園內部行政/園長留存的「異常事件/狀況通報紀錄」。

---
**輸入資訊：**
- 發生時間：${dateStr} ${time}
- 班級年齡層：${ageGroupNames}
- 幼生姓名：${childLabel}
- 事件情境：${context}
- 事件類別：${TOPICS[topic].name}

**輸出要求：**
1. 格式必須是**純文字公文風格**，包含：
   - 【行政通報紀錄】(標題)
   - 發生時間
   - 相關人員
   - 事件經過 (5W1H，去除情緒形容詞，只寫客觀事實)
   - 當下處置 (老師做了什麼)
   - 家長聯繫 (已告知/未告知，聯繫方式)
   - 後續追蹤
2. 語氣：**極度客觀、簡潔、專業、去情緒化**。
3. 不要有 Markdown 格式。
`;
}
