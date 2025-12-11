// lib/supabaseServer.ts
/**
 * Server-side Supabase client (Service Role Key 사용)
 * 
 * API Routes에서 DB 접근 시 사용
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Service Role 권한의 Supabase 클라이언트 생성
 * 
 * 주의: 이 클라이언트는 RLS를 우회합니다.
 * 서버 사이드(API Routes)에서만 사용하세요.
 */
export function createSupabaseServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
