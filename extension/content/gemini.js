// =========================================================
// Gemini 웹 어댑터 — gemini.google.com
// background.js 의 sendMessage 를 받아서:
//   1) 입력창에 프롬프트 주입
//   2) 응답 스트리밍 종료 감지
//   3) JSON 추출 후 응답
// =========================================================

const SELECTORS = {
  // ⚠️ 셀렉터는 자주 변경됨. 실제 구현 시 최신 DOM 으로 갱신 필요
  input: 'rich-textarea[contenteditable="true"], div[contenteditable="true"]',
  sendBtn: 'button[aria-label*="Send"], button[aria-label*="보내기"]',
  responseContainer: 'message-content, .response-container',
  copyBtn: 'button[aria-label*="Copy"], button[aria-label*="복사"]',
};

const PROMPT_TEMPLATE = (url, lang = 'ko') => `
다음 웹페이지를 ${lang === 'ko' ? '한국어로' : 'in English'} 분석해 JSON으로만 답하세요. 다른 텍스트 없이 JSON만.
URL: ${url}

반환 형식:
{
  "oneLiner": "60자 이내 한 줄 요약",
  "summary": "1-2문장 자세한 요약",
  "tags": ["태그1","태그2","태그3"]
}
태그는 소문자/하이픈, 3~6개, 일반적이고 검색 가능한 단어로.
`.trim();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'qlink-summarize-request') return;
  summarize(msg.payload)
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true;
});

async function summarize({ url, lang }) {
  const prompt = PROMPT_TEMPLATE(url, lang);

  // 1) 입력창 찾기 (재시도)
  const input = await waitFor(() => document.querySelector(SELECTORS.input), 5000);
  if (!input) throw new Error('Gemini 입력창을 찾지 못했습니다');

  // 2) 텍스트 주입
  input.focus();
  document.execCommand('insertText', false, prompt);
  // 또는 ContentEditable 트릭:
  if (!input.textContent.includes(prompt)) {
    input.textContent = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 3) 전송 버튼
  const sendBtn = await waitFor(() => document.querySelector(SELECTORS.sendBtn), 3000);
  if (!sendBtn) throw new Error('전송 버튼을 찾지 못했습니다');
  sendBtn.click();

  // 4) 응답 완료 감지 — 복사 버튼 출현을 신호로 사용
  const initialResponseCount = document.querySelectorAll(SELECTORS.copyBtn).length;
  await waitFor(() => {
    const newCount = document.querySelectorAll(SELECTORS.copyBtn).length;
    return newCount > initialResponseCount;
  }, 30000);

  // 5) 마지막 응답 텍스트 추출
  const responses = document.querySelectorAll(SELECTORS.responseContainer);
  const lastText = responses[responses.length - 1]?.innerText?.trim() || '';

  // 6) JSON 파싱 (간혹 코드블록으로 감싸져서 옴)
  const json = parseJsonFromText(lastText);
  if (!json) throw new Error('AI 응답에서 JSON을 찾지 못했습니다');

  return {
    oneLiner: String(json.oneLiner || '').slice(0, 80),
    summary: String(json.summary || ''),
    tags: Array.isArray(json.tags) ? json.tags.slice(0, 6) : [],
    provider: 'gemini-web',
    durationMs: 0,
  };
}

function waitFor(check, timeout = 5000, interval = 200) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      const result = check();
      if (result) return resolve(result);
      if (Date.now() - t0 > timeout) return resolve(null);
      setTimeout(tick, interval);
    };
    tick();
  });
}

function parseJsonFromText(text) {
  if (!text) return null;
  // ```json ... ``` 블록 우선
  const block = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/i);
  if (block) {
    try { return JSON.parse(block[1]); } catch {}
  }
  // 첫 { ... } 매칭
  const first = text.match(/\{[\s\S]+\}/);
  if (first) {
    try { return JSON.parse(first[0]); } catch {}
  }
  return null;
}
