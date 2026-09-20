import { createClient } from "@supabase/supabase-js";

// 브라우저 싱글턴. 정적 사이트라 서버 쪽 클라이언트는 만들지 않는다.
// 여기 들어가는 키는 공개돼도 되는 anon key 뿐이다 — service_role 키는 절대 넣지 않는다.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
