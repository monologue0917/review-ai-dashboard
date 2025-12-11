# 📁 전체 파일 구조 및 적용 가이드

## 🗂️ 파일 구조

```
ReviewAI-Implementation/
│
├── README.md                           ← 전체 개요
│
├── stage1-settings-policy/
│   ├── README.md
│   ├── migration.sql
│   ├── settings-route.ts
│   ├── integrations-reviews-route.ts
│   └── SettingsPanel.tsx
│
├── google-oauth-backend/
│   ├── README.md
│   ├── migration-google-oauth.sql
│   ├── oauth-utils.ts
│   ├── auth-start-route.ts
│   ├── auth-callback-route.ts
│   └── env-example.txt
│
└── google-oauth-frontend/
    ├── README.md
    ├── settings-page.tsx
    └── SettingsPanel.tsx
```

---

## 📋 적용 순서 (경로 포함)

### **Stage 1: 자동 답글 정책**

```bash
# 1. DB 마이그레이션
stage1-settings-policy/migration.sql
→ Supabase SQL Editor에서 실행

# 2. 백엔드 API
stage1-settings-policy/settings-route.ts
→ 프로젝트/app/api/salons/[id]/settings/route.ts

stage1-settings-policy/integrations-reviews-route.ts
→ 프로젝트/app/api/integrations/reviews/route.ts

# 3. 프론트엔드
stage1-settings-policy/SettingsPanel.tsx
→ 프로젝트/app/components/auth/SettingsPanel.tsx
```

---

### **Google OAuth 백엔드**

```bash
# 1. DB 마이그레이션
google-oauth-backend/migration-google-oauth.sql
→ Supabase SQL Editor에서 실행

# 2. 유틸리티
google-oauth-backend/oauth-utils.ts
→ 프로젝트/lib/google/oauth-utils.ts

# 3. OAuth 라우트
google-oauth-backend/auth-start-route.ts
→ 프로젝트/app/api/google/auth/start/route.ts

google-oauth-backend/auth-callback-route.ts
→ 프로젝트/app/api/google/auth/callback/route.ts

# 4. 환경변수 참고
google-oauth-backend/env-example.txt
→ .env.local에 추가 (파일로 복사하지 말고 내용만 참고)
```

---

### **Google OAuth 프론트엔드**

```bash
# Settings UI
google-oauth-frontend/settings-page.tsx
→ 프로젝트/app/settings/page.tsx

google-oauth-frontend/SettingsPanel.tsx
→ 프로젝트/app/components/auth/SettingsPanel.tsx
```

---

## ⚠️ 주의사항

### 1. **SettingsPanel.tsx 충돌**

Stage 1과 Google OAuth Frontend에서 **같은 파일**을 수정합니다:
- `app/components/auth/SettingsPanel.tsx`

**해결 방법:**
1. **Stage 1 먼저 적용**
2. **그 다음 Google OAuth Frontend의 SettingsPanel.tsx로 덮어쓰기**
   (Google OAuth Frontend 버전이 Stage 1 내용을 모두 포함하고 있음)

### 2. **환경변수 파일**

`google-oauth-backend/env-example.txt`는:
- ❌ `.env.local`로 복사하지 마세요
- ✅ 내용을 참고해서 기존 `.env.local`에 **추가**하세요

---

## 🎯 단계별 체크리스트

### Stage 1
- [ ] DB 마이그레이션 실행
- [ ] settings-route.ts 복사
- [ ] integrations-reviews-route.ts 복사
- [ ] SettingsPanel.tsx 복사
- [ ] Settings 페이지에서 "Minimum rating" 드롭다운 확인

### Google OAuth 백엔드
- [ ] DB 마이그레이션 실행
- [ ] oauth-utils.ts 복사
- [ ] auth-start-route.ts 복사
- [ ] auth-callback-route.ts 복사
- [ ] .env.local에 환경변수 추가
- [ ] Google Cloud Console 설정
- [ ] OAuth 플로우 테스트

### Google OAuth 프론트엔드
- [ ] settings-page.tsx 복사
- [ ] SettingsPanel.tsx 복사 (Stage 1 버전 위에 덮어쓰기)
- [ ] "Connect Google" 버튼 확인
- [ ] OAuth 성공 시 녹색 배너 확인

---

## 📞 문제 발생 시

각 폴더의 README.md 파일을 참고하세요:
- Stage 1 문제 → `stage1-settings-policy/README.md`
- OAuth 백엔드 문제 → `google-oauth-backend/README.md`
- OAuth 프론트엔드 문제 → `google-oauth-frontend/README.md`