# QLINK Bridge (Chrome Extension)

사용자의 **본인 웹 AI 세션** (Gemini / ChatGPT / Claude.ai)을 통해 큐링크가 링크를 요약하도록 하는 브릿지 확장프로그램.

## 동작 흐름

```
큐링크 웹앱(qlink.app)
   │  window.postMessage({ type: 'qlink-summarize', ... })
   ▼
content/qlink-bridge.js   (qlink.app 도메인에서 동작)
   │  chrome.runtime.sendMessage
   ▼
background.js (Service Worker)
   │  chrome.tabs.query / sendMessage
   ▼
content/gemini.js  (gemini.google.com 탭에서 동작)
   │  DOM 조작 — 프롬프트 주입 → 응답 폴링 → JSON 추출
   ▼
거꾸로 응답 전달
```

## 개발 모드 설치

1. Chrome → `chrome://extensions/`
2. 우상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension/` 폴더 선택

## 테스트

1. https://gemini.google.com 에 로그인된 상태로 한 탭 열어두기
2. 큐링크 웹앱(prototype 또는 app) 에서 콘솔 열고:
   ```js
   const correlationId = crypto.randomUUID();
   const responsePromise = new Promise(resolve => {
     window.addEventListener('message', function handler(e) {
       if (e.data?.type === 'qlink-summarize-response' && e.data.correlationId === correlationId) {
         window.removeEventListener('message', handler);
         resolve(e.data.response);
       }
     });
   });
   window.postMessage({
     type: 'qlink-summarize',
     provider: 'gemini',
     correlationId,
     payload: { url: 'https://react.dev/learn', lang: 'ko' },
   }, '*');
   await responsePromise;
   ```

## ⚠️ 알려진 제약 / 리스크

1. **DOM 셀렉터 취약성** — Gemini/ChatGPT/Claude 모두 자주 UI 갱신.
   `content/*.js` 의 SELECTORS 상수를 한 곳에서 관리하고 정기 업데이트 필요.
2. **자동화 차단 가능성** — 짧은 시간 다수 요청 시 reCAPTCHA 등 트리거.
   요청 간 랜덤 지연(2~5초) 및 단발 사용 권장.
3. **모바일 미지원** — Chrome Extension이 모바일에서 동작 안 함.
   모바일은 공식 API 폴백 필요 (`Anthropic API` / `OpenAI API` / `Gemini API`).
4. **ToS** — 각 AI 서비스의 자동화 정책을 사용자가 본인 책임으로 사용.
   확장은 사용자 본인 세션·본인 페이지에서만 동작하므로 일반 자동화 도구 범주.

## 다음 단계

- [ ] ChatGPT 어댑터 (`content/chatgpt.js`) 구현
- [ ] Claude 어댑터 (`content/claude.js`) 구현
- [ ] popup UI — 활성/비활성 토글, 사용량 표시
- [ ] options page — 셀렉터 커스터마이징, 요청 간격 설정
- [ ] 큐링크 웹앱에서 확장 감지 (`window.qlinkBridge?.installed`)
- [ ] 아이콘 PNG 추가 (16/48/128px)
- [ ] 에러 핸들링 — 로그인 안 된 상태 등 분기

## 프로덕션 배포

Chrome Web Store 등록 ($5 일회성 개발자 등록비):
1. ZIP 빌드 — `extension/` 폴더를 zip
2. https://chrome.google.com/webstore/devconsole 업로드
3. 리뷰 1~3일 (host_permissions 가 광범위해서 추가 검토 가능)

또는 사용자에게 "개발자 모드 + 압축해제 로드"를 안내하는 방식으로 사이드로드 (베타 단계 권장).
