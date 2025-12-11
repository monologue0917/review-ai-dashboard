// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저에서 쓸 클라이언트 (나중에 필요하면 사용)
export const supabaseBrowser = createClient(supabaseUrl, anonKey);
