---
name: backend-api-spec
description: 큐링크 백엔드 REST API 계약 명세
owner: backend-developer
---

# 백엔드 API 스펙 스킬

## 공통 규칙
- Base: `https://api.qlink.app/v1`
- 인증: `Authorization: Bearer {jwt}`
- Content-Type: `application/json`
- 시간: ISO 8601 UTC
- 에러:
```json
{ "error": { "code": "LINK_NOT_FOUND", "message": "..." } }
```

## 엔드포인트

### Auth
- `POST /auth/signup` — { email, password } → { user, token }
- `POST /auth/login` — { email, password } → { user, token }
- `POST /auth/oauth/google` — { idToken } → { user, token }

### Links
- `POST /links` — { url, folderId? } → Link (서버가 메타+요약 비동기 시작)
- `GET /links?folderId&tag&cursor&limit` → { items: Link[], nextCursor }
- `GET /links/:id` → Link
- `PATCH /links/:id` — { title?, summary?, tags?, folderId?, reminderAt? }
- `DELETE /links/:id`
- `POST /links/:id/summarize` — { provider? } → { jobId }
- `GET /links/:id/summary-status` → { status: 'pending'|'done'|'failed', result? }

### Folders
- `GET /folders` → Folder[]
- `POST /folders` — { name, color, parentId? }
- `PATCH /folders/:id`, `DELETE /folders/:id`

### Search
- `GET /search?q&types[]&folder` → { links, folders, tags }

### Reminders
- `POST /reminders` — { linkId, at } → Reminder
- `DELETE /reminders/:id`

### Push Subscription
- `POST /push/subscribe` — { endpoint, keys } (Web Push)

## 모델
```ts
type Link = {
  id: string;
  userId: string;
  folderId: string | null;
  url: string;
  title: string;
  summary: string | null;
  oneLiner: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  sourceType: 'url' | 'qr';
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Folder = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  color: string;
  count: number;
};
```

## 메타 추출 워커 (서버 내부)
- 큐: BullMQ(Redis)
- Job: `extract-meta(linkId)` → og:title, og:description, og:image
- 재시도: 3회 (1s, 5s, 30s)

## 풀텍스트 검색
- Postgres `tsvector` (한국어는 `pg_jieba` 또는 외부 검색엔진(OpenSearch) 검토)
- 인덱스: `to_tsvector('simple', title || ' ' || summary || ' ' || array_to_string(tags, ' '))`
