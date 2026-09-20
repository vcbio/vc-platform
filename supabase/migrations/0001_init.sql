-- VC 플랫폼 MVP 초기 스키마 (1c)
-- 기존 Supabase 프로젝트와 섞이지 않도록 모든 객체에 vcp_ 접두어를 붙인다.
-- 가격 정보(단가·매입가·마진)는 스키마 자체에 두지 않는다 — 공개 저장소·공개 DB 유출 방지.

-- ─────────────────────────────────────────────────────────────
-- 1. 테이블
-- ─────────────────────────────────────────────────────────────

-- 1-1. 사용자 프로필 (auth.users 1:1)
create table if not exists public.vcp_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  company_name text,
  role         text not null default 'buyer' check (role in ('buyer', 'maker', 'admin')),
  created_at   timestamptz not null default now()
);

comment on table public.vcp_profiles is 'VC플랫폼 사용자 프로필. role=buyer(유통사)/maker(공장)/admin(운영)';

-- 1-2. 제조사 (공장) — 표시명은 익명 처리된 값만 넣는다
create table if not exists public.vcp_manufacturers (
  id             uuid primary key default gen_random_uuid(),
  display_name   text not null,
  region         text,
  certifications text[] not null default '{}',
  dosage_forms   text[] not null default '{}',
  moq_range      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on column public.vcp_manufacturers.display_name is '익명 표시명(예: A사). 실명 기재 금지.';
comment on column public.vcp_manufacturers.moq_range is '최소주문수량 범위 문자열(예: 5,000~10,000EA). 금액 아님.';

-- 1-3. 원료
create table if not exists public.vcp_ingredients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text,
  origin       text,
  spec         text,
  dosage_forms text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 1-4. 견적 요청
create table if not exists public.vcp_quotes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.vcp_profiles(id) on delete cascade,
  product_type  text,
  dosage_form   text,
  quantity      integer,
  unit          text,
  ingredients   text,
  target_date   date,
  budget_range  text,
  memo          text,
  status        text not null default '접수' check (status in ('접수', '검토중', '회신완료', '종료')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.vcp_quotes.budget_range is '요청자가 직접 적는 예산 구간 문자열. 우리 단가·원가가 아니다.';

create index if not exists vcp_quotes_user_id_idx on public.vcp_quotes (user_id);
create index if not exists vcp_quotes_status_idx  on public.vcp_quotes (status);

-- ─────────────────────────────────────────────────────────────
-- 2. 헬퍼 — 관리자 판정
--    RLS 정책 안에서 vcp_profiles 를 다시 읽으면 정책이 자기 자신을 호출해
--    무한 재귀가 난다. security definer 로 RLS 를 우회해 끊는다.
-- ─────────────────────────────────────────────────────────────

create or replace function public.vcp_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vcp_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.vcp_is_admin() from public;
grant execute on function public.vcp_is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. 가입 시 프로필 자동 생성
-- ─────────────────────────────────────────────────────────────

create or replace function public.vcp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vcp_profiles (id, email, company_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'company_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists vcp_on_auth_user_created on auth.users;
create trigger vcp_on_auth_user_created
  after insert on auth.users
  for each row execute function public.vcp_handle_new_user();

-- 3-1. updated_at 자동 갱신
create or replace function public.vcp_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vcp_quotes_touch_updated_at on public.vcp_quotes;
create trigger vcp_quotes_touch_updated_at
  before update on public.vcp_quotes
  for each row execute function public.vcp_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. RLS — 정적 사이트라 권한의 진짜 문은 여기뿐이다.
--    클라이언트 가드는 화면 정리용일 뿐 보안 경계가 아니다.
-- ─────────────────────────────────────────────────────────────

alter table public.vcp_profiles      enable row level security;
alter table public.vcp_manufacturers enable row level security;
alter table public.vcp_ingredients   enable row level security;
alter table public.vcp_quotes        enable row level security;

-- 4-1. profiles: 본인 행 읽기·수정, admin 은 전체
drop policy if exists vcp_profiles_select_own   on public.vcp_profiles;
drop policy if exists vcp_profiles_update_own   on public.vcp_profiles;
drop policy if exists vcp_profiles_select_admin on public.vcp_profiles;
drop policy if exists vcp_profiles_update_admin on public.vcp_profiles;

create policy vcp_profiles_select_own on public.vcp_profiles
  for select to authenticated using (id = auth.uid());

-- 본인 행 수정. role 승격 차단은 정책이 아니라 아래 5절의 컬럼 단위 GRANT 로 한다
-- (정책 안에서 vcp_profiles 를 다시 select 하면 같은 테이블 정책이 재귀한다).
create policy vcp_profiles_update_own on public.vcp_profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy vcp_profiles_select_admin on public.vcp_profiles
  for select to authenticated using (public.vcp_is_admin());

create policy vcp_profiles_update_admin on public.vcp_profiles
  for update to authenticated using (public.vcp_is_admin()) with check (public.vcp_is_admin());

-- 4-2. manufacturers: 활성 행은 익명 포함 누구나 조회, 쓰기는 admin 만
drop policy if exists vcp_manufacturers_select_active on public.vcp_manufacturers;
drop policy if exists vcp_manufacturers_write_admin   on public.vcp_manufacturers;

create policy vcp_manufacturers_select_active on public.vcp_manufacturers
  for select to anon, authenticated using (is_active);

create policy vcp_manufacturers_write_admin on public.vcp_manufacturers
  for all to authenticated using (public.vcp_is_admin()) with check (public.vcp_is_admin());

-- 4-3. ingredients: 동일
drop policy if exists vcp_ingredients_select_active on public.vcp_ingredients;
drop policy if exists vcp_ingredients_write_admin   on public.vcp_ingredients;

create policy vcp_ingredients_select_active on public.vcp_ingredients
  for select to anon, authenticated using (is_active);

create policy vcp_ingredients_write_admin on public.vcp_ingredients
  for all to authenticated using (public.vcp_is_admin()) with check (public.vcp_is_admin());

-- 4-4. quotes: 본인 것만 넣고 본인 것만 본다. admin 은 전체 조회·수정.
drop policy if exists vcp_quotes_insert_own   on public.vcp_quotes;
drop policy if exists vcp_quotes_select_own   on public.vcp_quotes;
drop policy if exists vcp_quotes_select_admin on public.vcp_quotes;
drop policy if exists vcp_quotes_update_admin on public.vcp_quotes;

create policy vcp_quotes_insert_own on public.vcp_quotes
  for insert to authenticated with check (user_id = auth.uid());

create policy vcp_quotes_select_own on public.vcp_quotes
  for select to authenticated using (user_id = auth.uid());

create policy vcp_quotes_select_admin on public.vcp_quotes
  for select to authenticated using (public.vcp_is_admin());

create policy vcp_quotes_update_admin on public.vcp_quotes
  for update to authenticated using (public.vcp_is_admin()) with check (public.vcp_is_admin());

-- ─────────────────────────────────────────────────────────────
-- 5. 기본 권한 — RLS 가 걸린 테이블에만 최소 권한을 준다.
-- ─────────────────────────────────────────────────────────────

grant select          on public.vcp_manufacturers to anon, authenticated;
grant select          on public.vcp_ingredients   to anon, authenticated;
grant insert, update, delete on public.vcp_manufacturers to authenticated;
grant insert, update, delete on public.vcp_ingredients   to authenticated;
-- profiles 는 컬럼 단위로 준다 — role 컬럼에 update 권한을 주지 않으면
-- 본인이 스스로 admin 으로 승격할 수 없다. 승격은 admin 정책 또는 service_role 로만.
grant select on public.vcp_profiles to authenticated;
grant update (company_name) on public.vcp_profiles to authenticated;
-- role 변경은 Supabase 대시보드/service_role 로만 한다(관리자도 웹에서 못 바꾼다).
grant select, insert, update on public.vcp_quotes to authenticated;
