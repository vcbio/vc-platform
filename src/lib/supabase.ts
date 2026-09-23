import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 정적 빌드에는 공개용 키만 넣는다. 설정 전에는 인증을 닫아 둔다.
// service_role 키는 브라우저와 NEXT_PUBLIC 환경 변수에 절대 넣지 않는다.
export const supabase =
  url?.startsWith("https://") && key && key.length > 20
    ? createClient(url, key)
    : null;
