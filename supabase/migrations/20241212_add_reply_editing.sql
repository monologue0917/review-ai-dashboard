-- supabase/migrations/20241212_add_reply_editing.sql
-- Review Reply 편집/게시 기능을 위한 스키마 확장

-- =====================================================
-- 1. review_replies 테이블에 새 컬럼 추가
-- =====================================================

ALTER TABLE review_replies
ADD COLUMN IF NOT EXISTS ai_draft_text TEXT,
ADD COLUMN IF NOT EXISTS final_text TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS platform_reply_id TEXT,
ADD COLUMN IF NOT EXISTS posted_text TEXT,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edited_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- 2. 기존 데이터 마이그레이션
-- =====================================================

-- reply_text 값을 ai_draft_text, final_text로 복사
UPDATE review_replies
SET 
  ai_draft_text = COALESCE(ai_draft_text, reply_text),
  final_text = COALESCE(final_text, reply_text),
  status = CASE 
    WHEN posted_success = true THEN 'posted'
    ELSE 'draft'
  END,
  updated_at = COALESCE(updated_at, now())
WHERE (ai_draft_text IS NULL OR final_text IS NULL)
  AND reply_text IS NOT NULL;

-- =====================================================
-- 3. UNIQUE 제약 추가 (review_id + channel)
-- =====================================================

-- 중복 데이터 정리 (가장 최신 것만 유지)
DELETE FROM review_replies a
USING review_replies b
WHERE a.id < b.id
  AND a.review_id = b.review_id
  AND a.channel IS NOT DISTINCT FROM b.channel;

-- UNIQUE 제약 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_replies_review_id_channel_key'
  ) THEN
    ALTER TABLE review_replies
    ADD CONSTRAINT review_replies_review_id_channel_key 
    UNIQUE (review_id, channel);
  END IF;
END $$;

-- =====================================================
-- 4. 인덱스 추가
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_review_replies_status ON review_replies(status);
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_salon_id ON review_replies(salon_id);

-- =====================================================
-- 5. status 체크 제약 (선택)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'review_replies_status_check'
  ) THEN
    ALTER TABLE review_replies
    ADD CONSTRAINT review_replies_status_check 
    CHECK (status IN ('draft', 'approved', 'posted', 'failed'));
  END IF;
END $$;
