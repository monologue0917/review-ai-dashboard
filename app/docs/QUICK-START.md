# 🚀 ReviewAI - 빠른 적용 가이드

## 📦 다운로드한 파일 구조

```
ReviewAI-Implementation/
├── README.md                    ← 시작은 여기서!
├── FILE-STRUCTURE.md            ← 전체 구조 및 경로
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

## ⚡ 빠른 시작 (3단계)

### **1단계: README.md 읽기**
```
README.md 파일을 열어서 전체 개요 파악
```

### **2단계: 순서대로 적용**
```
1) stage1-settings-policy/README.md 보고 Stage 1 적용
2) google-oauth-backend/README.md 보고 백엔드 적용  
3) google-oauth-frontend/README.md 보고 프론트엔드 적용
```

### **3단계: 테스트**
```
각 단계의 README.md에 있는 "테스트 체크리스트" 확인
```

---

## 📋 각 파일을 어디에 복사해야 하나?

### **Stage 1**
| 파일 | 목적지 |
|------|--------|
| `migration.sql` | Supabase SQL Editor |
| `settings-route.ts` | `app/api/salons/[id]/settings/route.ts` |
| `integrations-reviews-route.ts` | `app/api/integrations/reviews/route.ts` |
| `SettingsPanel.tsx` | `app/components/auth/SettingsPanel.tsx` |

### **Google OAuth 백엔드**
| 파일 | 목적지 |
|------|--------|
| `migration-google-oauth.sql` | Supabase SQL Editor |
| `oauth-utils.ts` | `lib/google/oauth-utils.ts` |
| `auth-start-route.ts` | `app/api/google/auth/start/route.ts` |
| `auth-callback-route.ts` | `app/api/google/auth/callback/route.ts` |
| `env-example.txt` | `.env.local` (내용만 추가) |

### **Google OAuth 프론트엔드**
| 파일 | 목적지 |
|------|--------|
| `settings-page.tsx` | `app/settings/page.tsx` |
| `SettingsPanel.tsx` | `app/components/auth/SettingsPanel.tsx` |

---

## ⚠️ 중요: SettingsPanel.tsx 충돌 해결

`SettingsPanel.tsx` 파일은 **Stage 1**과 **OAuth Frontend** 모두에서 수정합니다.

**해결 방법:**
1. Stage 1 적용 (첫 번째 SettingsPanel.tsx)
2. OAuth Frontend 적용 (두 번째 SettingsPanel.tsx로 덮어쓰기)

→ OAuth Frontend 버전이 Stage 1 내용을 모두 포함하고 있습니다!

---

## 🎯 지금 바로 시작하기

```bash
1. README.md 열기
2. 첫 번째 링크 클릭: stage1-settings-policy/README.md
3. 거기 나온 대로 따라하기
```

**각 README.md에 상세한 설명이 모두 있습니다!**

---

막히는 부분이 있으면:
- 해당 폴더의 README.md > "문제 해결" 섹션 확인
- FILE-STRUCTURE.md에서 전체 구조 확인