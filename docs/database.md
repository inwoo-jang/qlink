# DB 설계 (AWS)

> 실서비스 백엔드는 **AWS 직접 설계**. 이 문서는 엔티티·관계·권한·인덱스를 한 장에 정리한 단일 출처(SoT).
> 기존 [supabase/migrations/](../supabase/migrations/)는 프로토타입의 라이브 DB로 유지되며, 본 설계의 **출처/검증 기반**으로만 참조합니다.

---

## 1. 권장 구성

| 컴포넌트 | 선택 | 이유 |
|---------|------|------|
| RDBMS | **Amazon RDS for PostgreSQL 16** (또는 Aurora Serverless v2) | 기존 검증된 스키마(현 Supabase Postgres) 그대로 이식 가능. `tsvector`·`gin` 인덱스·트리거 사용. |
| 인증 | **Amazon Cognito User Pools** | OAuth(Google/Apple/Kakao) + 이메일 가입 + JWT. JWT의 `sub`를 `users.id`로 사용. |
| API | **API Gateway (HTTP API) + AWS Lambda (Node.js 20)** | 서버리스, JWT Authorizer로 Cognito 토큰 검증. 트래픽 급증 자동 대응. |
| 객체 저장 | **S3** (썸네일·아바타) + **CloudFront** | `thumbnail_url`, `avatar`. 프리사인 URL로 업로드. |
| 비동기 작업 | **EventBridge + SQS + Lambda** | AI 요약 작업 큐(`ai_jobs`). 트리거: 링크 INSERT 후 publish. |
| 시크릿 | **Secrets Manager** | DB 자격증명·외부 API 키. |
| 관측 | **CloudWatch Logs + X-Ray** | 람다 로그·추적. Sentry는 프론트만. |

> 💡 MVP라면 RDS 대신 Aurora Serverless v2(min 0.5 ACU)로 시작 → DAU 500 넘으면 RDS Provisioned로 전환.

---

## 2. ERD (엔티티 관계도)

```
                ┌─────────────┐
                │   users     │  (Cognito sub = id)
                │ id, email   │
                └──────┬──────┘
                       │ 1:1
                ┌──────▼──────┐         ┌──────────────────┐
                │  profiles   │◀────────│ folder_members   │
                │ display_name│ M:N     │ folder_id, user_id│
                │ avatar      │         │ role             │
                └──────┬──────┘         └────────┬─────────┘
                       │ 1:N                     │
                ┌──────▼──────┐  1:N  ┌──────────▼─────────┐
                │   folders   │◀──────│  folder_invites    │
                │ name, emoji │       │ token, expires_at  │
                │ shared      │       └────────────────────┘
                └──────┬──────┘
                       │ 1:N
                ┌──────▼──────┐  1:N  ┌────────────┐
                │    links    │──────▶│  ai_jobs   │
                │ url, summary│       │ provider   │
                │ tags[]      │       │ status     │
                │ reminder_at │       └────────────┘
                └─────────────┘
```

---

## 3. 테이블 정의

> 출처: [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql) + [0002, 0003](../supabase/migrations/). AWS 이식 시 RLS는 제거하고 Lambda 핸들러에서 권한 체크.

### `users` (Cognito 동기화 또는 직접 관리)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | Cognito `sub` |
| email | text unique | Cognito 동기화 |
| created_at | timestamptz | default now() |

### `profiles`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK / FK→users.id | on delete cascade |
| display_name | text not null | |
| avatar | text | 이모지 또는 S3 URL |
| provider | text default 'email' | 'email' \| 'google' \| 'apple' \| 'kakao' |
| created_at, updated_at | timestamptz | trigger로 갱신 |

### `folders`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | gen_random_uuid() |
| owner_id | uuid FK→profiles.id | cascade |
| name | text | |
| emoji | text default '📁' | |
| shared | boolean default false | true면 멤버 초대 가능 |
| created_at | timestamptz | |

인덱스: `(owner_id)`

### `folder_members` (M:N 멤버십)

| 컬럼 | 타입 | 비고 |
|------|------|------|
| folder_id | uuid FK→folders.id | cascade, PK1 |
| user_id | uuid FK→profiles.id | cascade, PK2 |
| role | text default 'member' | 'owner' \| 'member' \| 'viewer' |
| joined_at | timestamptz | |

인덱스: `(user_id)`

### `links`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| owner_id | uuid FK→profiles.id | cascade |
| folder_id | uuid FK→folders.id | on delete set null (폴더 삭제해도 링크는 유지) |
| url | text not null | |
| title | text | |
| summary | text | AI 요약 결과 |
| one_liner | text | 한 줄 요약 |
| tags | text[] default '{}' | |
| thumbnail_url | text | S3 URL |
| source_type | text default 'url' | 'url' \| 'qr' |
| reminder_at | timestamptz | 알림 예약 |
| created_at, updated_at | timestamptz | trigger |

인덱스:
- `(owner_id, created_at desc)` — 홈 피드
- `(folder_id)`
- `gin(tags)` — 태그 필터
- v2: `gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')))` — 풀텍스트 검색. v1은 ILIKE.

### `folder_invites`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| folder_id | uuid FK | cascade |
| inviter_id | uuid FK→profiles.id | |
| token | text unique | 32자 hex |
| expires_at | timestamptz | default now()+7d |
| created_at | timestamptz | |

인덱스: `(token)`

### `ai_jobs`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| link_id | uuid FK→links.id | cascade |
| provider | text | 'gemini' \| 'chatgpt' \| 'claude' \| 'gemini_api' \| ... |
| status | text default 'pending' | 'pending' \| 'done' \| 'failed' |
| raw_response | jsonb | 원본 응답 보존 |
| error | text | |
| created_at, completed_at | timestamptz | |

---

## 4. 권한 모델 (Lambda 측 — RLS 대체)

Cognito JWT에서 `sub`를 추출해 `userId`로 사용. 모든 핸들러에서 다음 가드:

| 리소스 | 읽기 | 쓰기 |
|--------|------|------|
| `profiles` (자기) | self | self |
| `profiles` (타인) | 같은 폴더 멤버일 때만 (display_name·avatar만) | ❌ |
| `folders` | owner OR (shared=true AND folder_members 포함) | owner only |
| `folder_members` | self OR 같은 폴더 멤버 | INSERT는 self (초대 토큰 검증 후), DELETE는 self 또는 폴더 owner |
| `links` | owner OR 폴더가 shared이고 멤버 | owner only |
| `folder_invites` | inviter | inviter create, 수락은 RPC |
| `ai_jobs` | 링크 owner | 시스템(Lambda)만 |

**초대 수락 RPC** — `POST /invites/:token/accept`:
1. `folder_invites`에서 토큰 조회 + `expires_at > now()` 검증
2. `folder_members`에 `(folder_id, current_user, 'member')` upsert
3. 폴더 ID 반환

---

## 5. 트리거·자동화

| 동작 | 구현 |
|------|------|
| `updated_at` 자동 갱신 | Postgres `BEFORE UPDATE` 트리거 (`profiles`, `links`) |
| 신규 가입 시 profile 생성 | Cognito Post-Confirmation Lambda → `profiles` insert (Supabase의 `handle_new_user()` 트리거 대체) |
| 링크 생성 시 AI 요약 큐잉 | API의 `POST /links` Lambda → SQS publish → 워커 Lambda가 `ai_jobs` insert + provider 호출 |

---

## 6. 마이그레이션 도구

**선택지 비교**:

| 도구 | 장점 | 단점 |
|------|------|------|
| **Prisma Migrate** | TS/Node 친화, 타입 자동 생성 | tsvector·gin·trigger는 raw SQL 필요 |
| **Drizzle Kit** | 가벼움, raw SQL 친화 | Prisma 대비 생태계 작음 |
| **node-pg-migrate** | 순수 SQL 친화, Postgres 기능 100% | 타입 자동 생성 없음 |

→ **권장: Drizzle** (Lambda 콜드스타트 작고, Postgres 기능 그대로 쓰기 좋음).

마이그레이션 위치: `app/db/migrations/` (또는 별도 `infra/db/`).

---

## 7. 환경 변수

```bash
# Lambda
DATABASE_URL=postgres://...    # Secrets Manager 통해 주입
COGNITO_USER_POOL_ID=ap-northeast-2_xxx
COGNITO_CLIENT_ID=xxx
S3_BUCKET=qlink-assets
SQS_AI_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/xxx/ai-jobs

# 프론트 (Vite)
VITE_API_BASE=https://api.qlink.app/v1
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
```

⚠️ Cognito Client Secret·DB 자격증명·service role key는 **클라이언트 변수로 절대 노출 금지**.

---

## 8. 다음 작업 순서 (백엔드 개발자용 체크리스트)

1. [ ] AWS 계정 + IAM 역할 생성 (`qlink-dev`, `qlink-prod`)
2. [ ] VPC + RDS Postgres (Aurora Serverless v2 권장) 프로비저닝
3. [ ] Cognito User Pool + App Client (Google/Apple/Kakao Identity Provider 등록)
4. [ ] Drizzle 셋업 + 본 문서의 7개 테이블 마이그레이션 작성
5. [ ] Lambda 핸들러 골격 + JWT Authorizer 연결
6. [ ] CRUD 엔드포인트 구현: `auth`, `profiles`, `folders`, `links`, `invites`
7. [ ] AI 워커 Lambda + SQS 큐 연결
8. [ ] OpenAPI 스펙 작성 — [docs/skills/backend-api-spec.md](skills/backend-api-spec.md)
9. [ ] CDK 또는 Terraform으로 IaC 정리
