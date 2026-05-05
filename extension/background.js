// =========================================================
// 큐링크 Bridge — Service Worker (백그라운드)
// 역할:
//   1) qlink 웹앱 → 확장 → AI 사이트 탭으로 메시지 라우팅
//   2) 응답을 거꾸로 qlink 웹앱에 전달
// =========================================================

const PROVIDER_URLS = {
  gemini: 'https://gemini.google.com/app',
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
};

// 외부 메시지 (qlink 웹앱 ↔ 확장)
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'qlink-summarize') return;
  routeToProvider(msg.provider || 'gemini', msg.payload)
    .then(result => sendResponse({ ok: true, result }))
    .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true;  // async 응답
});

async function routeToProvider(provider, payload) {
  const url = PROVIDER_URLS[provider];
  if (!url) throw new Error(`알 수 없는 provider: ${provider}`);

  // 해당 사이트 탭이 열려 있는지 확인 — 없으면 백그라운드로 신규 탭 오픈
  let tabs = await chrome.tabs.query({ url: `${new URL(url).origin}/*` });
  let tab = tabs[0];
  if (!tab) {
    tab = await chrome.tabs.create({ url, active: false });
    await waitForTabReady(tab.id);
  }

  // 컨텐츠 스크립트로 명령 전달
  return await chrome.tabs.sendMessage(tab.id, {
    type: 'qlink-summarize-request',
    payload,
  });
}

function waitForTabReady(tabId) {
  return new Promise(resolve => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // DOM 안정화 대기
        setTimeout(resolve, 1500);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}
