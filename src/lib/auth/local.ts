import type { AuthAdapter, Session } from "./index";

const SESSION_KEY = "vcp.session";
const USERS_KEY = "vcp.users";
const ADMIN_EMAIL = "vcbio15@gmail.com";

type StoredUser = { email: string; company?: string; createdAt: string };

// localStorage 가 막힌 브라우저에서도 가입·로그인이 멈추지 않게 메모리로 내려앉는다.
const mem = new Map<string, string>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    raw = raw ?? mem.get(key) ?? null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  mem.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // 저장소 차단 — 메모리에만 남긴다.
  }
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function toSession(user: StoredUser): Session {
  return { email: user.email, company: user.company, isAdmin: user.email === ADMIN_EMAIL };
}

/**
 * 로컬 모의 인증.
 *
 * ⚠️ 이건 보안 경계가 아니다 — 정적 사이트라 HTML·JS 는 누구나 받아간다.
 * 여기는 화면 흐름을 굴리기 위한 흉내이고, 실제 차단은 나중에 붙일
 * supabase 어댑터(RLS)가 한다.
 *
 * ponytail: 비밀번호는 저장하지 않는다(로컬 저장소 평문 보관을 만들지 않으려고).
 * 그래서 로그인은 "가입된 이메일 + 8자 이상"까지만 검사한다. 실제 검증은 supabase 어댑터에서.
 */
export const localAuth: AuthAdapter = {
  async getSession() {
    return read<Session | null>(SESSION_KEY, null);
  },

  async signIn(email, password) {
    const key = normalize(email);
    if (!key.includes("@")) return { error: "이메일 형식이 올바르지 않습니다." };
    if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

    const users = read<StoredUser[]>(USERS_KEY, []);
    const user = users.find((u) => u.email === key);
    if (!user) return { error: "가입되지 않은 이메일입니다. 먼저 가입해 주세요." };

    const session = toSession(user);
    write(SESSION_KEY, session);
    return { session };
  },

  async signUp(email, password, company) {
    const key = normalize(email);
    if (!key.includes("@")) return { error: "이메일 형식이 올바르지 않습니다." };
    if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

    const users = read<StoredUser[]>(USERS_KEY, []);
    if (users.some((u) => u.email === key)) return { error: "이미 가입된 이메일입니다." };

    const user: StoredUser = { email: key, company, createdAt: new Date().toISOString() };
    write(USERS_KEY, [...users, user]);

    // 로컬에서는 메일을 보낼 수 없으므로 인증을 통과한 것으로 보고 바로 세션을 만든다.
    const session = toSession(user);
    write(SESSION_KEY, session);
    return { session };
  },

  async signOut() {
    if (typeof window === "undefined") return;
    mem.delete(SESSION_KEY);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // 저장소 차단 — 메모리 세션만 지우면 된다.
    }
  },
};
