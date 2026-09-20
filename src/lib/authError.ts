// Supabase 가 돌려주는 영어 오류를 한국어로 바꾼다. 못 알아본 것은 원문을 그대로 보여준다.
const MAP: [RegExp, string][] = [
  [/invalid login credentials/i, "이메일 또는 비밀번호가 맞지 않습니다."],
  [/email not confirmed/i, "이메일 인증이 아직 안 됐습니다. 받은 메일함을 확인해 주세요."],
  [/user already registered|already been registered/i, "이미 가입된 이메일입니다."],
  [/password should be at least (\d+)/i, "비밀번호는 최소 $1자 이상이어야 합니다."],
  [/unable to validate email address|invalid email/i, "이메일 형식이 올바르지 않습니다."],
  [/email rate limit exceeded|too many requests/i, "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."],
  [/network|fetch/i, "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."],
];

export function toKorean(message: string): string {
  for (const [re, ko] of MAP) {
    if (re.test(message)) return message.replace(re, ko);
  }
  return message;
}
