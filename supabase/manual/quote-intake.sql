-- VC 플랫폼 견적 접수용 1회성 스키마. Supabase SQL Editor에서 검토·백업 후 적용한다.
-- 자동 migrations 폴더에 두지 않는다: 기존 0001_init_down.sql은 실행 대상이 아니다.
-- 기존 vcp_manufacturer_private 및 공개 제조사 자료를 변경하지 않는다.

begin;

do $$
begin
  if to_regclass('public.vcp_customer_profiles') is not null
     or to_regclass('public.vcp_quote_requests') is not null
     or to_regclass('public.vcp_quote_reviews') is not null then
    raise exception '견적 접수 표가 이미 있습니다. 덮어쓰기 없이 중단합니다.';
  end if;
end $$;

create table public.vcp_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null check (length(trim(email)) between 5 and 254 and position('@' in email) > 1),
  company_name text not null check (length(trim(company_name)) between 1 and 120),
  brand_name text not null check (length(trim(brand_name)) between 1 and 120),
  contact_name text not null check (length(trim(contact_name)) between 1 and 80),
  contact_phone text not null check (length(trim(contact_phone)) between 7 and 30),
  retention_consent boolean not null default false,
  retention_consent_at timestamptz,
  withdrawn_at timestamptz,
  purge_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((retention_consent and retention_consent_at is not null)
      or (not retention_consent and retention_consent_at is null)),
  check ((user_id is not null and withdrawn_at is null and purge_at is null)
      or (user_id is null and withdrawn_at is not null and purge_at is not null))
);

create table public.vcp_quote_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.vcp_customer_profiles(id) on delete cascade,
  product_type text not null check (length(trim(product_type)) between 1 and 160),
  dosage_form text not null check (length(trim(dosage_form)) between 1 and 60),
  quantity integer not null check (quantity > 0),
  unit text not null check (length(trim(unit)) between 1 and 20),
  ingredients text[] not null default '{}'
    check (cardinality(ingredients) <= 20 and length(array_to_string(ingredients, ',')) <= 1200),
  target_date date not null,
  budget_range text not null default '미정'
    check (budget_range in ('미정','협의 예정','상담 후 확정','사내 확정 · 상담 시 공유')),
  memo text not null default '' check (length(memo) <= 3000),
  status text not null default '접수' check (status in ('접수','검토중','회신완료','종료')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 운영자의 수동 배분 메모는 고객이 읽는 견적 행과 분리한다.
create table public.vcp_quote_reviews (
  quote_id uuid primary key references public.vcp_quote_requests(id) on delete cascade,
  assigned_partner_ids text[] not null default '{}',
  internal_note text not null default '' check (length(internal_note) <= 3000),
  updated_at timestamptz not null default now()
);

create index vcp_quote_requests_profile_created_idx on public.vcp_quote_requests (profile_id, created_at desc);
create index vcp_quote_requests_status_created_idx on public.vcp_quote_requests (status, created_at desc);

create function public.vcp_intake_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- 별도 선택 동의의 시각은 DB가 기록한다. 탈퇴 시 3년 만료일을 붙인다.
create function public.vcp_prepare_customer_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.retention_consent_at := case when new.retention_consent then now() else null end;
  else
    if new.retention_consent is distinct from old.retention_consent then
      new.retention_consent_at := case when new.retention_consent then now() else null end;
    else
      new.retention_consent_at := old.retention_consent_at;
    end if;
    if old.user_id is not null and new.user_id is null then
      new.withdrawn_at := now();
      new.purge_at := case when new.retention_consent then now() + interval '3 years' else now() end;
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

-- 별도 동의가 없는 고객은 탈퇴와 같은 거래 안에서 바로 지운다.
create function public.vcp_remove_unconsented_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is not null and new.user_id is null and not new.retention_consent then
    delete from public.vcp_customer_profiles where id = new.id;
  end if;
  return null;
end $$;

create trigger vcp_customer_profiles_prepare before insert or update on public.vcp_customer_profiles
for each row execute function public.vcp_prepare_customer_profile();
create trigger vcp_customer_profiles_remove_unconsented after update of user_id on public.vcp_customer_profiles
for each row execute function public.vcp_remove_unconsented_profile();
create trigger vcp_quote_requests_touch_updated_at before update on public.vcp_quote_requests
for each row execute function public.vcp_intake_touch_updated_at();
create trigger vcp_quote_reviews_touch_updated_at before update on public.vcp_quote_reviews
for each row execute function public.vcp_intake_touch_updated_at();

alter table public.vcp_customer_profiles enable row level security;
alter table public.vcp_quote_requests enable row level security;
alter table public.vcp_quote_reviews enable row level security;

revoke all on public.vcp_customer_profiles, public.vcp_quote_requests, public.vcp_quote_reviews from public, anon, authenticated;
grant select, insert on public.vcp_customer_profiles to authenticated;
grant update (email, company_name, brand_name, contact_name, contact_phone, retention_consent) on public.vcp_customer_profiles to authenticated;
grant delete on public.vcp_customer_profiles to authenticated;
grant select, insert on public.vcp_quote_requests to authenticated;
grant update (status) on public.vcp_quote_requests to authenticated;
grant select, insert, delete on public.vcp_quote_reviews to authenticated;
grant update (assigned_partner_ids, internal_note) on public.vcp_quote_reviews to authenticated;
revoke all on function public.vcp_intake_touch_updated_at() from public, anon, authenticated;
revoke all on function public.vcp_prepare_customer_profile() from public, anon, authenticated;
revoke all on function public.vcp_remove_unconsented_profile() from public, anon, authenticated;

create policy vcp_customer_profiles_select_own on public.vcp_customer_profiles
for select to authenticated using (
  user_id = (select auth.uid())
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
create policy vcp_customer_profiles_select_admin on public.vcp_customer_profiles
for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');
create policy vcp_customer_profiles_insert_own on public.vcp_customer_profiles
for insert to authenticated with check (
  user_id = (select auth.uid()) and email = (select auth.jwt() ->> 'email')
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
create policy vcp_customer_profiles_update_own on public.vcp_customer_profiles
for update to authenticated
using (user_id = (select auth.uid())
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
with check (user_id = (select auth.uid()) and email = (select auth.jwt() ->> 'email')
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
create policy vcp_customer_profiles_delete_archived_admin on public.vcp_customer_profiles
for delete to authenticated using (
  user_id is null and (select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin'
);

create policy vcp_quote_requests_select_own on public.vcp_quote_requests
for select to authenticated using (
  exists (select 1 from public.vcp_customer_profiles p
    where p.id = profile_id and p.user_id = (select auth.uid()))
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
create policy vcp_quote_requests_select_admin on public.vcp_quote_requests
for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');
create policy vcp_quote_requests_insert_own on public.vcp_quote_requests
for insert to authenticated with check (
  exists (select 1 from public.vcp_customer_profiles p
    where p.id = profile_id and p.user_id = (select auth.uid()))
  and status = '접수'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
create policy vcp_quote_requests_update_admin on public.vcp_quote_requests
for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');

create policy vcp_quote_reviews_select_admin on public.vcp_quote_reviews
for select to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');
create policy vcp_quote_reviews_insert_admin on public.vcp_quote_reviews
for insert to authenticated with check ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');
create policy vcp_quote_reviews_update_admin on public.vcp_quote_reviews
for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');
create policy vcp_quote_reviews_delete_admin on public.vcp_quote_reviews
for delete to authenticated using ((select auth.jwt() -> 'app_metadata' ->> 'vcp_role') = 'admin');

-- Supabase Cron을 미리 활성화하지 않았다면 전체 스키마 적용을 중단한다.
do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise exception 'Supabase Cron(pg_cron)을 먼저 활성화해 주세요. 스키마는 적용하지 않습니다.';
  end if;
end $$;

select cron.schedule(
  'vcp-customer-retention-purge',
  '0 3 * * *',
  $cron$delete from public.vcp_customer_profiles where user_id is null and purge_at <= now();$cron$
);

commit;
