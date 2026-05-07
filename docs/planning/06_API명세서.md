# 큐링크 (QLINK) — 백엔드 API 명세서

작성일: 2026-05-07
버전: v1.0
상위 문서: `02_PRD.md`, `05_상세기능명세서.md`, `../database.md`
대상: 백엔드 / 프론트엔드 / DevOps

> AWS 스택: API Gateway(HTTP API + WebSocket) + Lambda(Node.js 20 ARM) + RDS Postgres + Cognito + S3 + SQS + EventBridge.
> 인증·권한 모델은 `docs/database.md §4`, 테이블은 `§3` 참고.

---

## 1. 공통 규칙

### 1.1 Base URL
| 환경 | REST | WebSocket |
|---|---|---|
| Production | `https://api.qlink.app/v1` | `wss://ws.qlink.app/v1` |
| Staging | `https://api-staging.qlink.app/v1` | `wss://ws-staging.qlink.app/v1` |
| Local | `http://localhost:3000/v1` | `ws://localhost:3001/v1` |

### 1.2 인증
- 헤더: `Authorization: Bearer {access_token}` (JWT, Cognito 발급, 15분)
- 401 응답 → 클라이언트가 `POST /auth/refresh` 후 1회 재시도
- 리프레시 토큰: httpOnly 쿠키 (web) 또는 Secure Storage (PWA), 30일

### 1.3 헤더
| 헤더 | 필수 | 의미 |
|---|---|---|
| `Authorization` | 인증 필요 시 | Bearer JWT |
| `Content-Type` | ✓ | `application/json` 또는 `multipart/form-data` |
| `X-Device-Id` | ✓ | 디바이스 UUID (멀티디바이스 동기화·강제 로그아웃 키) |
| `X-Client-Version` | 선택 | `1.0.0` (분석용) |

### 1.4 시간 / 페이지네이션
- 시간: ISO 8601 UTC (`2026-05-07T12:34:56Z`)
- 페이지네이션: cursor 기반
  - 요청: `?cursor={base64}&limit=30` (기본 30, 최대 100)
  - 응답: `{ "items": [...], "nextCursor": "..." | null }`

### 1.5 에러 응답 (공통 포맷)
```json
{
  "error": {
    "code": "LINK_NOT_FOUND",
    "message": "이 링크를 찾을 수 없어요",
    "details": { "linkId": "abc-123" }
  },
  "requestId": "req_01H..."
}
```

### 1.6 Rate Limit
| 대상 | 한도 | 비고 |
|---|---|---|
| 인증된 요청 | 100 req/min/user | 초과 시 429 |
| 미인증 요청 | 30 req/min/IP | |
| 로그인 시도 | 5 회/min/email | 6회부터 차단 |
| AI 요약 호출 | 30 req/min/user | 일괄 import 별도 큐 |

응답 헤더: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` (429 시).

### 1.7 표준 에러 코드
| code | HTTP | 의미 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 토큰 없음·무효·만료 |
| `INVALID_PASSWORD` | 401 | 비밀번호 불일치 |
| `FORBIDDEN` | 403 | 권한 부족 (예: viewer가 쓰기 시도) |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 (`details.fields`) |
| `CONFLICT` | 409 | 중복 (이메일·URL·멤버) |
| `RATE_LIMITED` | 429 | 호출 제한 |
| `LINK_LIMIT_EXCEEDED` | 400 | 링크 10,000개 초과 |
| `FOLDER_LIMIT_EXCEEDED` | 400 | 폴더 100개 초과 |
| `MEMBER_LIMIT_EXCEEDED` | 400 | 공유 폴더 멤버 50명 초과 |
| `INVITE_EXPIRED` | 410 | 초대 토큰 만료 (7일) |
| `IMPORT_FORMAT_ERROR` | 400 | bookmarks.html 파싱 실패 |
| `INTERNAL_ERROR` | 500 | 서버 오류 |
| `SERVICE_UNAVAILABLE` | 503 | 일시적 장애 (재시도 권장) |

---

## 2. Auth (`/auth/*`)

### 2.1 POST /auth/signup
이메일 가입 + 인증 코드 발송.

Request:
```json
{ "email": "user@example.com", "password": "passW0rd!", "displayName": "지훈" }
```

검증:
- email: RFC5322 + 중복 불가
- password: 8~64자, 영문 + 숫자 필수
- displayName: 1~20자

Response **200**:
```json
{ "userId": "uuid", "verificationRequired": true }
```

Errors: `VALIDATION_ERROR`, `CONFLICT` (중복 이메일)

### 2.2 POST /auth/verify
6자리 인증 코드 검증.

Request: `{ "email": "...", "code": "123456" }`

Response **200**:
```json
{
  "user": { "userId": "...", "email": "...", "displayName": "...", "avatar": "🌸" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

Errors: `VALIDATION_ERROR` (코드 불일치), `GONE` (코드 만료, 10분 초과)

### 2.3 POST /auth/resend-code
인증 코드 재발송. 이전 코드 무효 처리.

Request: `{ "email": "..." }`
Response **200**: `{ "sentAt": "..." }`

### 2.4 POST /auth/login
Request: `{ "email": "...", "password": "..." }`
Response **200**: `{ "user": Profile, "accessToken": "...", "refreshToken": "..." }`
Errors: `INVALID_PASSWORD`, `RATE_LIMITED` (5회 실패)

> 보안: 미가입 이메일·잘못된 PW 모두 동일 메시지 ("이메일 또는 비밀번호가 일치하지 않아요")

### 2.5 POST /auth/refresh
Request: `{ "refreshToken": "..." }` (또는 httpOnly 쿠키 자동)
Response **200**: `{ "accessToken": "...", "refreshToken": "..." }` ← 리프레시 회전(rotation)

### 2.6 POST /auth/logout
현재 디바이스 토큰만 무효화.
Response **204** No Content.

### 2.7 POST /auth/password/change
Request: `{ "currentPassword": "...", "newPassword": "..." }`
Response **200**: `{ "loggedOutOtherDevices": true }`

부수효과: **모든 다른 디바이스 리프레시 토큰 invalidate**. WebSocket으로 `PASSWORD_CHANGED` publish → 다른 디바이스 강제 로그아웃.

Errors: `INVALID_PASSWORD`, `VALIDATION_ERROR`

### 2.8 POST /auth/password/reset-request *(v1.x)*
이메일로 리셋 링크 발송.
Request: `{ "email": "..." }`
Response **200**: 항상 동일 (이메일 노출 방지)

---

## 3. Profile / Account (`/me`)

### 3.1 GET /me
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "displayName": "지훈",
  "avatar": "🌸",
  "provider": "email",
  "aiProvider": "mock",
  "theme": { "mode": "light", "accent": "pink" },
  "notification": { "mobile": true, "desktop": true },
  "createdAt": "2026-05-07T..."
}
```

### 3.2 PATCH /me
부분 수정. `SYNC` 이벤트로 다른 디바이스 즉시 반영.
Request:
```json
{
  "displayName"?: "...",
  "avatar"?: "🐣",
  "aiProvider"?: "mock|chatgpt|gemini|claude|perplexity|user_api_key",
  "theme"?: { "mode": "light|dark", "accent": "pink|blue|gray" },
  "notification"?: { "mobile": true, "desktop": false }
}
```
Response **200**: 갱신된 Profile.

### 3.3 POST /me/api-key
사용자 본인 API 키 저장 (KMS 암호화).
Request: `{ "provider": "openai|gemini|anthropic|perplexity", "apiKey": "sk-..." }`
Response **200**: `{ "stored": true }` (키 자체는 응답하지 않음)

### 3.4 DELETE /me/api-key/:provider
저장된 API 키 삭제.
Response **204**.

### 3.5 DELETE /me
**즉시 hard delete**. 본인 데이터 영구 삭제.
Request: `{ "currentPassword": "..." }` (재인증 필수)
Response **204**.

부수효과:
- 트랜잭션으로 폴더·링크·공유 멤버십·API 키·푸시 구독·리프레시 토큰 모두 삭제
- WebSocket `USER_DELETED` 이벤트 → 모든 디바이스 강제 로그아웃

Errors: `INVALID_PASSWORD`

---

## 4. Folders (`/folders`)

### 4.1 GET /folders
사용자 폴더 + 가입한 공유 폴더 목록.
Response **200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "리서치",
      "emoji": "📚",
      "shared": false,
      "ownerId": "uuid",
      "memberCount": 1,
      "linkCount": 42,
      "role": "owner",
      "createdAt": "..."
    }
  ]
}
```

### 4.2 POST /folders
Request: `{ "name": "리서치", "emoji": "📚" }`
Response **201**: 생성된 Folder.
Errors: `VALIDATION_ERROR` (이름 1~30자), `FOLDER_LIMIT_EXCEEDED` (100개)

### 4.3 GET /folders/:id
단건 + 통계.
Response **200**: Folder + `{ "recentLinks": Link[5] }`
Errors: `NOT_FOUND`, `FORBIDDEN` (멤버 아님)

### 4.4 PATCH /folders/:id
오너만.
Request: `{ "name"?, "emoji"? }`
Response **200**.

### 4.5 DELETE /folders/:id
오너만. 소속 링크는 `folder_id=NULL`(미분류)로 자동 이동.
공유 폴더 삭제 시 멤버 전원 제거.
Response **204**.
Errors: `FORBIDDEN` (멤버는 `POST /folders/:id/leave` 사용)

### 4.6 POST /folders/:id/leave
공유 폴더에서 본인 탈퇴 (member·viewer).
Response **204**.

---

## 5. Folder Sharing (`/folders/:id/invites`, `/invites/:token`)

### 5.1 POST /folders/:id/invites
초대 토큰 발급 (오너). 폴더 자동으로 `shared=true`.
Response **201**:
```json
{
  "token": "abc...32hex",
  "url": "https://qlink.app/invite/abc...",
  "expiresAt": "2026-05-14T12:00:00Z"
}
```

### 5.2 POST /invites/:token/accept
초대 수락. 멤버 가입.
Response **200**: `{ "folderId": "uuid", "role": "member" }`
Errors: `INVITE_EXPIRED`, `MEMBER_LIMIT_EXCEEDED` (50명), `CONFLICT` (이미 멤버)

### 5.3 GET /folders/:id/members
멤버 목록.
Response **200**:
```json
{
  "items": [
    {
      "userId": "uuid",
      "displayName": "지훈",
      "avatar": "🌸",
      "role": "owner|member|viewer",
      "joinedAt": "..."
    }
  ]
}
```

### 5.4 PATCH /folders/:id/members/:userId
역할 변경 (오너만).
Request: `{ "role": "member|viewer" }` (owner는 양도 별도 RPC, v1.x)
Response **200**.

### 5.5 DELETE /folders/:id/members/:userId
멤버 제거 (오너) 또는 본인 탈퇴 (self).
Response **204**.

---

## 6. Links (`/links`)

### 6.1 POST /links
링크 생성 + AI 요약 비동기 큐잉.
Request:
```json
{
  "url": "https://example.com/article",
  "folderId": "uuid|null",
  "memo": "선택",
  "sourceType": "url|qr|share"
}
```

검증: URL ≤ 2,048자, http(s) 스킴.

Response **201**: 생성된 Link (요약 빈 상태). 1~5초 후 WebSocket `LINK_UPDATED` 이벤트로 요약 도착.

Errors:
- `VALIDATION_ERROR`
- `CONFLICT` (중복 URL) → `details: { existingLinkId: "..." }`
- `LINK_LIMIT_EXCEEDED` (10,000개)

### 6.2 GET /links
필터 + 페이지네이션.
Query: `?folderId=&tag=&sourceType=&q=&cursor=&limit=`
Response **200**: `{ "items": Link[], "nextCursor": "..." }`

### 6.3 GET /links/:id
단건. 권한: 본인 링크 또는 공유 폴더 멤버 링크.

### 6.4 PATCH /links/:id
Request: `{ "title"?, "summary"?, "tags"?, "folderId"?, "memo"?, "reminderAt"? }`

검증: 제목 ≤200, 요약 ≤500, 태그 ≤5×20자.

Response **200**: 갱신된 Link.

### 6.5 DELETE /links/:id
Response **204**.

### 6.6 POST /links/:id/summarize
수동 재요약 트리거.
Request: `{ "provider"?: "..." }` (생략 시 사용자 기본값)
Response **202**: `{ "jobId": "uuid" }`

### 6.7 GET /links/:id/summary-status
폴링용. (WebSocket이 우선이지만 폴백)
Response **200**:
```json
{
  "status": "pending|done|failed",
  "summary"?: "...",
  "tags"?: ["dev", "tutorial"],
  "error"?: "AI provider timeout"
}
```

### 6.8 Link Model
```json
{
  "id": "uuid",
  "url": "https://...",
  "title": "...",
  "summary": "한 줄 요약",
  "tags": ["dev", "tutorial"],
  "thumbnailUrl": "https://cdn.qlink.app/...",
  "folderId": "uuid|null",
  "ownerId": "uuid",
  "sourceType": "url|qr|share",
  "reminderAt": "...|null",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 7. Search (`/search`)

### 7.1 GET /search
Query: `?q={keyword}&types=link,folder,tag&folderId=&limit=30`

검증: q ≥ 2자.

구현:
- v1: `ILIKE '%kw%'` (Postgres) on `links.title`, `links.summary`, `unnest(tags)`
- v2: `tsvector` + `gin` 인덱스 (한국어 형태소 분석은 `pg_bigm` 또는 `pgroonga` 검토)

Response **200**:
```json
{
  "links": [Link, ...],
  "folders": [Folder, ...],
  "tags": ["dev", "tutorial"]
}
```

---

## 8. Reminders / Push (`/push`, `/me/notification`)

### 8.1 POST /push/subscribe
Web Push 구독 등록 (디바이스 단위).
Request:
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "...", "auth": "..." },
  "deviceType": "mobile|desktop"
}
```
Response **200**: `{ "subscriptionId": "uuid" }`

### 8.2 DELETE /push/subscriptions/:id
Response **204**.

### 8.3 PATCH /me/notification
모바일/PC 채널 토글. (`PATCH /me`로도 가능, 단축 별칭)
Request: `{ "mobile": true, "desktop": false }`
Response **200**.

### 8.4 알림 발송 (서버 내부)
- EventBridge Rule: `links.reminder_at` 시각마다 Lambda 트리거
- Lambda → FCM Topic 발송 (사용자의 활성 디바이스 모두)
- 사용자 설정 `notification.mobile=false` 또는 `desktop=false`인 채널은 스킵
- 발송 실패 시 24시간 후 1회 재시도 (DLQ 모니터링)

---

## 9. Import (`/imports/bookmarks`)

### 9.1 POST /imports/bookmarks
multipart/form-data.

| Field | 값 |
|---|---|
| `file` | bookmarks.html (≤5MB, Netscape Bookmark Format) |
| `mode` | `skip` (기본) / `overwrite` |

Response **202**:
```json
{
  "importId": "uuid",
  "totalFolders": 12,
  "totalLinks": 348,
  "previewUrl": "/imports/bookmarks/{importId}/preview"
}
```

Errors: `IMPORT_FORMAT_ERROR`, `VALIDATION_ERROR` (5MB 초과)

### 9.2 GET /imports/bookmarks/:id/preview
파싱된 폴더 트리.
Response:
```json
{
  "folders": [
    { "tempId": "f1", "name": "Tech", "linkCount": 30, "children": [...] }
  ],
  "links": [
    { "tempId": "l1", "url": "...", "title": "...", "folderTempId": "f1" }
  ],
  "duplicates": [
    { "url": "...", "existingLinkId": "uuid" }
  ]
}
```

### 9.3 POST /imports/bookmarks/:id/confirm
선택된 항목 import 시작.
Request:
```json
{
  "selectedFolderIds": ["f1", "f2"],
  "summarize": true
}
```
Response **202**: `{ "jobId": "uuid" }`

부수효과: 폴더·링크 일괄 INSERT (트랜잭션) → SQS에 AI 요약 작업 publish → WebSocket으로 진행률 stream.

### 9.4 GET /imports/bookmarks/:id/progress
Response:
```json
{
  "status": "running|done|failed",
  "completedLinks": 200,
  "totalLinks": 348,
  "summarizedLinks": 150,
  "errors": []
}
```

> v1.x: Pocket·Raindrop import 대칭 구조로 `/imports/{provider}` 추가 예정.

---

## 10. WebSocket (SYNC-001)

### 10.1 연결
```
wss://ws.qlink.app/v1?token={accessToken}&deviceId={uuid}
```

연결 직후 서버 환영 메시지:
```json
{ "type": "WELCOME", "userId": "uuid", "deviceId": "uuid", "serverTime": "..." }
```

### 10.2 클라이언트 → 서버
| type | payload | 의미 |
|---|---|---|
| `PING` | — | Heartbeat (30s 간격) |
| `SUBSCRIBE` | `{ "topics": ["links", "folders", "members"] }` | 토픽 구독 (기본 모두) |
| `SYNC_DELTA_REQUEST` | `{ "since": "2026-05-07T..." }` | 끊김 후 재연결 시 변경분 일괄 fetch |

### 10.3 서버 → 클라이언트
| type | payload | 발생 시점 |
|---|---|---|
| `WELCOME` | `{ userId, deviceId, serverTime }` | 연결 직후 |
| `PONG` | — | PING 응답 |
| `LINK_CREATED` | `{ "link": Link }` | 다른 디바이스에서 링크 생성 |
| `LINK_UPDATED` | `{ "link": Link }` | UPDATE (요약 도착 / 편집 / 폴더 이동) |
| `LINK_DELETED` | `{ "linkId": "uuid" }` | DELETE |
| `FOLDER_CREATED` | `{ "folder": Folder }` | |
| `FOLDER_UPDATED` | `{ "folder": Folder }` | |
| `FOLDER_DELETED` | `{ "folderId": "uuid" }` | |
| `MEMBER_ADDED` | `{ "folderId", "member": Member }` | 공유 폴더 멤버 가입 |
| `MEMBER_REMOVED` | `{ "folderId", "userId" }` | |
| `MEMBER_ROLE_CHANGED` | `{ "folderId", "userId", "role" }` | 역할 변경 |
| `IMPORT_PROGRESS` | `{ "importId", "completedLinks", "totalLinks" }` | 일괄 import 진행률 |
| `PROFILE_UPDATED` | `{ "profile": Profile }` | 다른 디바이스에서 프로필 변경 |
| `PASSWORD_CHANGED` | — | 다른 디바이스에서 비밀번호 변경 → 강제 로그아웃 트리거 |
| `USER_DELETED` | — | 본인 데이터 초기화 → 모든 디바이스 강제 로그아웃 |
| `SYNC_DELTA` | `{ "links": [], "folders": [], "members": [], "since": "..." }` | DELTA_REQUEST 응답 |

### 10.4 재연결 정책
- 끊김 시 클라이언트 backoff: **1s, 2s, 4s, 8s, 30s**
- 재연결 후 즉시 `SYNC_DELTA_REQUEST` (since=last_received_at)로 보정
- 30초 이상 재연결 실패 시 5s polling으로 폴백
- 폴링 폴백 endpoint: `GET /sync/delta?since=...` → 동일 페이로드

---

## 11. AWS 인프라 매핑

| 영역 | AWS 서비스 | 메모 |
|---|---|---|
| HTTP REST | API Gateway (HTTP API) + Lambda (Node.js 20 ARM64) | Lambda 콜드스타트 ≤ 800ms 목표 |
| WebSocket | API Gateway WebSocket API + Lambda | 연결 라우팅: `$connect`, `$disconnect`, `$default`, `subscribe`, `ping` |
| 인증 | Cognito User Pool + JWT Authorizer | 액세스 15분 / 리프레시 30일. 비밀번호 변경 시 `AdminGlobalSignOut` |
| DB | RDS Postgres 16 (또는 Aurora Serverless v2) | `docs/database.md` |
| AI 요약 큐 | SQS (FIFO 또는 표준) | 워커 Lambda가 ChatGPT/Gemini/Claude API 호출 |
| 알림 예약 | EventBridge (각 reminder_at에 1회성 Rule) → Lambda → FCM | 또는 DynamoDB TTL + Lambda |
| 파일 (썸네일·아바타·import) | S3 + CloudFront | 사전 서명 URL로 직접 업로드 |
| 시크릿 | Secrets Manager | DB 자격증명·외부 API 키 |
| 로깅·추적 | CloudWatch Logs + X-Ray | 모든 Lambda에 X-Ray 활성 |
| IaC | CDK (TypeScript) 권장 | Terraform 대안 |

---

## 12. OpenAPI 자동 생성

이 마크다운 명세를 기반으로 OpenAPI 3.1 YAML(`api/openapi.yaml`)을 v1.0 단계에서 작성. 권장:
- **백엔드**: TypeScript 인터페이스 → `zod-to-openapi` 또는 `tsoa`로 자동 생성
- **프론트**: `openapi-typescript`로 클라이언트 SDK 생성

---

## 13. 변경 이력

| 일자 | 버전 | 변경 내용 |
|---|---|---|
| 2026-05-07 | v1.0 | 최초 작성. 50+ 엔드포인트 (Auth 8 / Profile 5 / Folders 6 / Sharing 5 / Links 7 / Search 1 / Push 4 / Import 4 / WebSocket 17 이벤트). AWS 인프라 매핑·에러 코드·Rate Limit 포함. 결정 12건(2026-05-07) 모두 반영 |
