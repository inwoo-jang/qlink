// =========================================================
// 큐링크 웹앱 ↔ 확장 브릿지
// 웹앱에서 window.postMessage 로 보낸 요청을 확장 → AI 사이트로 전달
// =========================================================

const EXT_ID = chrome.runtime.id;

// 웹앱이 확장이 설치되어 있는지 감지할 수 있도록 마커 부여
window.postMessage({ type: 'qlink-bridge-installed', extensionId: EXT_ID }, '*');

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (msg?.type !== 'qlink-summarize') return;

  // chrome.runtime.sendMessage 는 외부 페이지에서 직접 호출이 제한적이라
  // content script 가 중계
  const response = await chrome.runtime.sendMessage({
    type: 'qlink-summarize-internal',
    provider: msg.provider,
    payload: msg.payload,
    correlationId: msg.correlationId,
  });

  window.postMessage({
    type: 'qlink-summarize-response',
    correlationId: msg.correlationId,
    response,
  }, '*');
});

// background → content 메시지 (provider에서 응답 도착)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'qlink-bridge-result') {
    window.postMessage(msg, '*');
  }
});
