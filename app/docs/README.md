# ReviewAI Dashboard - 구현 가이드

네일샵 리뷰 관리 SaaS의 Google OAuth 연동 및 자동 답글 시스템 구현 문서입니다.

---

## 🎯 전체 구조

```
ReviewAI Dashboard
├─ 자동 답글 정책 (Stage 1)
├─ Google OAuth 백엔드
└─ Google OAuth 프론트엔드
```

---

## 📦 구현 단계

### **1. Stage 1: 자동 답글 정책**
📁 [stage1-settings-policy/](stage1-settings-policy/)

**내용:**
- 별점 기반 자동 답글 설정
- `auto_reply_min_rating` 필드 추가
- Settings에서 최소 별점 선택 가능 (1-5점)
- 기본값: 4점 (4-5점 리뷰만 자동 답글)

**적용 파일:**
- DB 마이그레이션
- `/api/salons/[id]/settings`
- `/api/integrations/reviews`
- `SettingsPanel.tsx`

👉 **[상세 가이드 보기](stage1-settings-policy/README.md)**

---

### **2. Google OAuth 백엔드**
📁 [google-oauth-backend/](google-oauth-backend/)

**내용:**
- Google OAuth 2.0 인증 플로우
- DB 스키마 (google_accounts, salon_google_connections)
- Access Token & Refresh Token 저장
- State 암호화 및 검증

**적용 파일:**
- DB 마이그레이션
- `lib/google/oauth-utils.ts`
- `/api/google/auth/start`
- `/api/google/auth/callback`
- 환경변수 설정

👉 **[상세 가이드 보기](google-oauth-backend/README.md)**

---

### **3. Google OAuth 프론트엔드**
📁 [google-oauth-frontend/](google-oauth-frontend/)

**내용:**
- Settings 페이지에 "Connect Google" 버튼 추가
- OAuth 결과 배너 (성공/에러)
- Google 연결 상태 UI

**적용 파일:**
- `app/settings/page.tsx`
- `app/components/auth/SettingsPanel.tsx`

👉 **[상세 가이드 보기](google-oauth-frontend/README.md)**

---

## 🚀 적용 순서

### **Step 1: Stage 1 먼저 적용**
```bash
# 1. DB 마이그레이션
stage1-settings-policy/migration.sql → Supabase SQL Editor 실행

# 2. 백엔드 API 업데이트
stage1-settings-policy/settings-route.ts → app/api/salons/[id]/settings/route.ts
stage1-settings-policy/integrations-reviews-route.ts → app/api/integrations/reviews/route.ts

# 3. 프론트엔드 업데이트
stage1-settings-policy/SettingsPanel.tsx → app/components/auth/SettingsPanel.tsx
```

### **Step 2: Google OAuth 백엔드 적용**
```bash
# 1. DB 마이그레이션
google-oauth-backend/migration-google-oauth.sql → Supabase SQL Editor 실행

# 2. 유틸리티 함수
google-oauth-backend/oauth-utils.ts → lib/google/oauth-utils.ts

# 3. OAuth 라우트
google-oauth-backend/auth-start-route.ts → app/api/google/auth/start/route.ts
google-oauth-backend/auth-callback-route.ts → app/api/google/auth/callback/route.ts

# 4. 환경변수 설정
google-oauth-backend/env-example.txt → .env.local에 추가
```

### **Step 3: Google OAuth 프론트엔드 적용**
```bash
# Settings UI 업데이트
google-oauth-frontend/settings-page.tsx → app/settings/page.tsx
google-oauth-frontend/SettingsPanel.tsx → app/components/auth/SettingsPanel.tsx
```

---

## ✅ 완료 체크리스트

### Stage 1
- [ ] DB에 `auto_reply_min_rating` 컬럼 추가
- [ ] Settings에서 최소 별점 선택 가능
- [ ] Webhook API가 별점 기준으로 자동 답글 판단

### Google OAuth 백엔드
- [ ] DB에 `google_accounts`, `salon_google_connections` 테이블 생성
- [ ] Google Cloud Console OAuth 설정
- [ ] 환경변수 설정 완료
- [ ] OAuth 플로우 테스트 성공

### Google OAuth 프론트엔드
- [ ] Settings에 "Connect Google" 버튼 표시
- [ ] OAuth 성공 시 녹색 배너 표시
- [ ] DB에 토큰 저장 확인

---

## 📋 다음 단계 (구현 예정)

### Phase 4: Business Profile Location 선택
- [ ] `/api/google/locations/list` 생성
- [ ] Settings UI에 Location 선택 드롭다운 추가
- [ ] `salon_google_connections.location_id` 업데이트

### Phase 5: 리뷰 동기화
- [ ] `lib/google/syncReviewsForSalon.ts` 생성
- [ ] `/api/google/sync-reviews` 엔드포인트
- [ ] Business Profile API로 리뷰 가져오기
- [ ] "Sync now" 버튼 추가

### Phase 6: 자동 동기화 (Cron)
- [ ] Vercel Cron 설정
- [ ] 15분마다 모든 살롱 동기화
- [ ] 에러 로깅 및 알림

---

## 🐛 문제 해결

각 단계별 README의 "문제 해결" 섹션을 참고하세요:

- **Stage 1 문제**: [stage1-settings-policy/README.md - 문제 해결](stage1-settings-policy/README.md#-문제-해결)
- **OAuth 백엔드 문제**: [google-oauth-backend/README.md - 문제 해결](google-oauth-backend/README.md#-문제-해결)
- **OAuth 프론트엔드 문제**: [google-oauth-frontend/README.md - 문제 해결](google-oauth-frontend/README.md#-문제-해결)

---

## 🎯 현재 완성된 기능

✅ **자동 답글 시스템**
- 별점 기준 자동 답글 (설정 가능)
- AI 답글 생성
- 이메일 알림

✅ **Google OAuth 인증**
- OAuth 2.0 플로우
- Access Token & Refresh Token 저장
- 보안 State 검증

✅ **Settings UI**
- "Connect Google" 버튼
- 연결 상태 표시
- OAuth 결과 배너

---

## 📞 지원

문의사항이 있으면 언제든 말씀해 주세요!