-- 0001_init.sql 롤백 — 역순 drop.
-- ⚠️ 테이블을 지우면 그 안의 데이터도 함께 사라진다. 실행 전 백업할 것.

drop trigger if exists vcp_on_auth_user_created on auth.users;
drop trigger if exists vcp_quotes_touch_updated_at on public.vcp_quotes;

drop function if exists public.vcp_handle_new_user();
drop function if exists public.vcp_touch_updated_at();

drop table if exists public.vcp_manufacturer_private;
drop table if exists public.vcp_quotes;
drop table if exists public.vcp_ingredients;
drop table if exists public.vcp_manufacturers;
drop table if exists public.vcp_profiles;

-- 정책은 테이블과 함께 사라지므로 따로 지우지 않는다.
-- 헬퍼는 정책이 전부 사라진 뒤에 지운다.
drop function if exists public.vcp_is_admin();
