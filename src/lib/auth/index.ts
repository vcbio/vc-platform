import { localAuth } from "./local";

export type Session = {
  email: string;
  company?: string;
  /** 관리자 판정은 어댑터가 한다. 지금은 이메일이 vcbio15@gmail.com 이면 관리자. */
  isAdmin: boolean;
};

export type AuthResult = { session?: Session; error?: string };

export type AuthAdapter = {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, company?: string): Promise<AuthResult>;
  signOut(): Promise<void>;
};

/** 지금은 local 하나뿐이다. supabase 어댑터가 생기면 여기서 갈아끼운다. */
function adapter(): AuthAdapter {
  return localAuth;
}

export const getSession = () => adapter().getSession();
export const signIn = (email: string, password: string) => adapter().signIn(email, password);
export const signUp = (email: string, password: string, company?: string) =>
  adapter().signUp(email, password, company);
export const signOut = () => adapter().signOut();

export async function isAdmin(): Promise<boolean> {
  return (await adapter().getSession())?.isAdmin ?? false;
}
