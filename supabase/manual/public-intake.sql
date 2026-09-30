-- 공개 문의 접수함 설치 초안. 검토 후 Supabase SQL Editor에서 별도로 실행한다.
-- 공식 근거:
-- https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker
-- https://supabase.com/docs/guides/cron

begin;

do $preflight$
begin
  if to_regclass('public.vcp_customer_profiles') is null then
    raise exception '기존 고객 프로필 표가 없습니다. 대상 Supabase 프로젝트를 다시 확인하세요.';
  end if;
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise exception 'pg_cron을 사용할 수 없습니다. 예약 삭제를 보장할 수 없어 설치를 중단합니다.';
  end if;
  if to_regclass('public.vcp_public_inquiries') is not null
     or to_regclass('public.vcp_public_intake_limits') is not null
     or to_regprocedure('public.vcp_list_public_inquiries()') is not null
     or to_regprocedure('public.vcp_submit_public_intake(text,text,text,text,text,text,text,text,text,text,text)') is not null then
    raise exception '공개 접수 객체가 이미 있습니다. 기존 구조를 확인한 뒤 명시적 마이그레이션을 사용하세요.';
  end if;
end
$preflight$;

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

do $cron_preflight$
begin
  if exists (select 1 from cron.job where jobname = 'vcp-public-intake-purge') then
    raise exception '같은 이름의 예약 작업이 이미 있습니다. 내용을 확인한 뒤 다시 적용하세요.';
  end if;
end
$cron_preflight$;

create table public.vcp_public_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quick_quote', 'manufacturer_application')),
  ingredient text,
  dosage_form text,
  quantity text,
  company_name text,
  region text,
  certifications text,
  dosage_forms text,
  contact text not null,
  consent_at timestamptz not null,
  privacy_version text not null,
  created_at timestamptz not null default clock_timestamp(),
  purge_after timestamptz not null default (clock_timestamp() + interval '3 years'),
  constraint vcp_public_inquiries_shape check (
    (kind = 'quick_quote' and ingredient is not null and dosage_form is not null and quantity is not null
      and company_name is null and region is null and certifications is null and dosage_forms is null)
    or
    (kind = 'manufacturer_application' and company_name is not null and region is not null
      and certifications is not null and dosage_forms is not null
      and ingredient is null and dosage_form is null and quantity is null)
  )
);

create table public.vcp_public_intake_limits (
  scope_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  purge_after timestamptz not null,
  primary key (scope_key, window_started_at)
);

comment on table public.vcp_public_inquiries is '비회원 문의·제조사 입점 신청 비공개 접수함';
alter table public.vcp_public_inquiries enable row level security;
alter table public.vcp_public_intake_limits enable row level security;

revoke all on public.vcp_public_inquiries from public, anon, authenticated;
revoke all on public.vcp_public_intake_limits from public, anon, authenticated;

create function public.vcp_list_public_inquiries()
returns setof public.vcp_public_inquiries
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce((select auth.jwt() -> 'app_metadata' ->> 'vcp_role'), '') <> 'admin' then
    raise exception using errcode = '42501', message = 'admin_only';
  end if;
  return query
    select * from public.vcp_public_inquiries order by created_at desc;
end
$function$;

revoke execute on function public.vcp_list_public_inquiries() from public, anon;
grant execute on function public.vcp_list_public_inquiries() to authenticated;

create function public.vcp_submit_public_intake(
  p_kind text,
  p_ip_hash text,
  p_ingredient text,
  p_dosage_form text,
  p_quantity text,
  p_company_name text,
  p_region text,
  p_certifications text,
  p_dosage_forms text,
  p_contact text,
  p_privacy_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz := date_trunc('hour', v_now);
  v_global_count integer;
  v_ip_count integer;
  v_quantity numeric;
  v_id uuid;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_fingerprint';
  end if;
  if p_privacy_version <> '2026-09-30' then
    raise exception using errcode = '22023', message = 'invalid_privacy_version';
  end if;

  -- 잠금 순서를 전역→IP로 고정해 동시 요청도 같은 한도 안에서 센다.
  perform pg_advisory_xact_lock(hashtextextended('vcp-public-intake:global', 0));
  perform pg_advisory_xact_lock(hashtextextended('vcp-public-intake:ip:' || p_ip_hash, 0));

  insert into public.vcp_public_intake_limits(scope_key, window_started_at, request_count, purge_after)
  values ('global', v_window, 1, v_now + interval '1 day')
  on conflict (scope_key, window_started_at) do update
    set request_count = public.vcp_public_intake_limits.request_count + 1
  returning request_count into v_global_count;
  if v_global_count > 60 then
    raise exception using errcode = 'P0001', message = 'global_rate_limit';
  end if;

  insert into public.vcp_public_intake_limits(scope_key, window_started_at, request_count, purge_after)
  values ('ip:' || p_ip_hash, v_window, 1, v_now + interval '1 day')
  on conflict (scope_key, window_started_at) do update
    set request_count = public.vcp_public_intake_limits.request_count + 1
  returning request_count into v_ip_count;
  if v_ip_count > 5 then
    raise exception using errcode = 'P0001', message = 'ip_rate_limit';
  end if;

  if p_contact is null or length(p_contact) > 120 or not (
    p_contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
    or (p_contact ~ '^[0-9+().[:space:]-]+$'
      and regexp_replace(p_contact, '[().[:space:]-]', '', 'g') ~ '^(\+82|0)(10|2|3[123]|4[1-4]|5[1-5]|6[1-4]|70)[0-9]{7,8}$')
  ) then
    raise exception using errcode = '22023', message = 'invalid_contact';
  end if;

  if p_kind = 'quick_quote' then
    if p_ingredient is null or length(p_ingredient) not between 2 and 100
      or p_dosage_form not in ('정제','캡슐','환','분말','스틱','젤리','액상','기타')
      or p_quantity is null or length(p_quantity) > 32
      or p_quantity !~ '^(0\.[0-9]+|[1-9][0-9]{0,8}(\.[0-9]+)?|[1-9][0-9]{0,2}(,[0-9]{3}){1,2}(\.[0-9]+)?)[[:space:]]*(병|개|포|정|캡슐|박스|세트|kg|g|L|mL)$'
    then
      raise exception using errcode = '22023', message = 'invalid_quick_quote';
    end if;
    v_quantity := replace(substring(p_quantity from '^[0-9.,]+'), ',', '')::numeric;
    if v_quantity <= 0 then
      raise exception using errcode = '22023', message = 'invalid_quick_quote';
    end if;
    insert into public.vcp_public_inquiries(
      kind, ingredient, dosage_form, quantity, contact, consent_at, privacy_version
    ) values (
      p_kind, p_ingredient, p_dosage_form, p_quantity, p_contact, v_now, p_privacy_version
    ) returning id into v_id;
  elsif p_kind = 'manufacturer_application' then
    if p_company_name is null or length(p_company_name) not between 2 and 100
      or p_region is null or length(p_region) not between 2 and 80
      or p_certifications is null or length(p_certifications) not between 2 and 300
      or p_dosage_forms is null or length(p_dosage_forms) not between 2 and 300
    then
      raise exception using errcode = '22023', message = 'invalid_manufacturer_application';
    end if;
    insert into public.vcp_public_inquiries(
      kind, company_name, region, certifications, dosage_forms, contact, consent_at, privacy_version
    ) values (
      p_kind, p_company_name, p_region, p_certifications, p_dosage_forms, p_contact, v_now, p_privacy_version
    ) returning id into v_id;
  else
    raise exception using errcode = '22023', message = 'invalid_kind';
  end if;

  return v_id;
end
$function$;

revoke execute on function public.vcp_submit_public_intake(text,text,text,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.vcp_submit_public_intake(text,text,text,text,text,text,text,text,text,text,text)
  to service_role;

select cron.schedule(
  'vcp-public-intake-purge',
  '17 3 * * *',
  $cron$
    delete from public.vcp_public_inquiries where purge_after <= clock_timestamp();
    delete from public.vcp_public_intake_limits where purge_after <= clock_timestamp();
  $cron$
);

commit;
