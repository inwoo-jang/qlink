---
name: ai-web-bridge
description: 웹 Gemini/ChatGPT/Claude 세션을 통한 AI 요약 어댑터 구현 가이드
owner: ai-integration-developer
---

# AI 웹 브릿지 스킬

## 통일 인터페이스
모든 백엔드(웹세션·공식API·로컬모델)는 아래 인터페이스를 구현한다.

```ts
type AIProvider = 'gemini-web' | 'chatgpt-web' | 'claude-web' | 'gemini-api' | 'openai-api' | 'anthropic-api';

interface SummarizeInput {
  url: string;
  html?: string;       // 클라이언트가 미리 추출한 본문(선택)
  lang?: 'ko' | 'en';
}

interface SummarizeOutput {
  summary: string;     // 1~2 문장
  oneLiner: string;    // 카드용 한 줄 (≤ 60자)
  tags: string[];      // 3~6개
  provider: AIProvider;
  durationMs: number;
}
```

## 옵션 A — Chrome Extension (메인)

### 구성
```
extension/
  manifest.json         # MV3
  background.ts         # 메시지 라우터
  content/
    chatgpt.ts          # chat.openai.com / chatgpt.com
    gemini.ts           # gemini.google.com
    claude.ts           # claude.ai
  bridge.ts             # 큐링크 웹앱 ↔ 확장 통신
```

### 동작 흐름
1. 큐링크 웹앱이 `window.postMessage({ type: 'qlink-summarize', payload })` 호출
2. 확장 `bridge.ts`(content script, qlink.app 도메인)에서 수신
3. `background.ts` 가 chosen provider 탭으로 명령 전송
4. provider content script가 입력창에 프롬프트 주입 → 응답 polling → 파싱
5. 결과를 reverse path로 큐링크 앱에 반환

### DOM 어댑터 주의사항
- 각 서비스는 DOM 구조가 자주 변경됨 → 셀렉터를 한 곳(`selectors.ts`)에 모음
- 응답 완료 감지: 스트리밍 종료 시 나타나는 "복사" 버튼 등 idle 신호 사용
- 너무 빈번한 자동화는 차단 위험 → 요청 간 randomized delay

## 옵션 C — 공식 API (폴백)
```ts
async function summarizeWithApi(input, apiKey, provider) {
  // Gemini, OpenAI, Anthropic SDK 분기
}
```

## 프롬프트 (요약 + 태그 동시 산출)
```
다음 웹페이지를 한국어로 분석해 JSON으로만 답하세요.
URL: {url}
{html ? `본문:\n${truncate(html, 12000)}` : ''}

반환 형식:
{
  "oneLiner": "60자 이내 한국어 한 줄 요약",
  "summary": "1-2문장 자세한 요약",
  "tags": ["태그1","태그2","태그3"]
}
태그는 소문자/하이픈, 3~6개, 일반적이고 검색 가능한 단어로.
```

## 캐싱 / 재시도
- URL 해시(SHA-256) 키로 24h 캐시
- 네트워크 실패: 지수 백오프 3회
- provider 실패 시 다음 provider로 자동 폴백

## 보안 / 컴플라이언스
- 사용자 동의 없이 본문을 외부 전송하지 않음(설정에서 명시)
- 확장 권한은 최소화: 필요한 도메인만 host_permissions에 등록
- ToS 위반 위험 명시: 옵션 A는 사용자 본인 세션 한정, 자동화 빈도 제한
