-- ============================================================================
--  বাজার হিসাব — Supabase ডেটাবেস সেটআপ
--  Supabase Dashboard → SQL Editor → New query → এই পুরো লেখা বসিয়ে RUN চাপুন।
--  আবার চালালেও কোনো ডেটা নষ্ট হয় না (নিরাপদ)।
--
--  ★ শুধু নিচের লাইনে 'আপনার-ইমেইল@gmail.com' বদলে নিজের ইমেইল দিন ★
-- ============================================================================

do $$
declare
  admin_email text := 'আপনার-ইমেইল@gmail.com';   -- <<<<< এখানে নিজের ইমেইল দিন
begin
  if admin_email !~ '^\S+@\S+\.\S+$' or admin_email like '%আপনার%' then
    raise exception 'আগে ওপরের admin_email লাইনে নিজের ইমেইল বসান, তারপর আবার RUN করুন';
  end if;

  create table if not exists public.app_admin (email text primary key);
  insert into public.app_admin(email) values (lower(trim(admin_email))) on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- ১) টেবিল
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id          text primary key,
  name        text        not null,
  phone       text        not null default '',
  photo       text        not null default '',
  active      boolean     not null default true,   -- রান্নার পালায় আছেন কিনা
  removed     boolean     not null default false,  -- "সরানো" = ট্র্যাশে (মোছা নয়)
  ord         integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.entries (
  id          text primary key,
  date        date        not null,
  member_id   text        not null,
  menu        text        not null default '',
  items       jsonb       not null default '[]'::jsonb,
  total       numeric(12,2) not null default 0 check (total >= 0),
  note        text        not null default '',
  deleted     boolean     not null default false,  -- ট্র্যাশে আছে কিনা (মোছা নয়)
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists entries_date_idx on public.entries(date);

create table if not exists public.meals (
  date        date        not null,
  member_id   text        not null,
  count       integer     check (count is null or (count >= 0 and count <= 20)),  -- null = স্বাভাবিক (১)
  updated_at  timestamptz not null default now(),
  primary key (date, member_id)
);

create table if not exists public.settings (
  key         text primary key,
  value       jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- প্রতিটি যোগ/বদলের আগের-পরের রূপ এখানে চিরতরে জমা থাকে
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  tbl         text        not null,
  op          text        not null,
  row_key     text,
  old_row     jsonb,
  new_row     jsonb,
  actor       text
);
create index if not exists audit_log_tbl_idx on public.audit_log(tbl, row_key);

-- ---------------------------------------------------------------------------
-- ২) অ্যাডমিন চেক (শুধু app_admin-এ থাকা ইমেইলই ঢুকতে পারবে)
-- ---------------------------------------------------------------------------
alter table public.app_admin enable row level security;   -- কোনো policy নেই = কেউ সরাসরি পড়তে পারে না

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admin
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- ৩) কখনো মোছা যাবে না: DELETE ও TRUNCATE ডেটাবেস নিজেই আটকায়
-- ---------------------------------------------------------------------------
create or replace function public.block_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'এই ডেটাবেসে কিছু মোছা যায় না (টেবিল: %)', tg_table_name using errcode = '42501';
end;
$$;

create or replace function public.block_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'লগ বদলানো যায় না (টেবিল: %)', tg_table_name using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------------
-- ৪) পরিবর্তনের লগ ও updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.write_audit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(coalesce(new, old));
  k text;
begin
  k := coalesce(j ->> 'id', (j ->> 'date') || '|' || (j ->> 'member_id'), j ->> 'key');
  insert into public.audit_log(tbl, op, row_key, old_row, new_row, actor)
  values (tg_table_name, tg_op, k,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end,
          coalesce(auth.jwt() ->> 'email', current_user));
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['members','entries','meals','settings'] loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before update on public.%I for each row execute function public.touch_updated_at()', t);

    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update on public.%I for each row execute function public.write_audit()', t);

    execute format('drop trigger if exists trg_no_delete on public.%I', t);
    execute format('create trigger trg_no_delete before delete on public.%I for each row execute function public.block_delete()', t);

    execute format('drop trigger if exists trg_no_truncate on public.%I', t);
    execute format('create trigger trg_no_truncate before truncate on public.%I for each statement execute function public.block_delete()', t);
  end loop;

  -- লগ টেবিল: বদলানো/মোছা দুটোই বন্ধ
  drop trigger if exists trg_no_delete on public.audit_log;
  create trigger trg_no_delete before delete on public.audit_log for each row execute function public.block_delete();
  drop trigger if exists trg_no_truncate on public.audit_log;
  create trigger trg_no_truncate before truncate on public.audit_log for each statement execute function public.block_delete();
  drop trigger if exists trg_no_update on public.audit_log;
  create trigger trg_no_update before update on public.audit_log for each row execute function public.block_update();
end $$;

-- ---------------------------------------------------------------------------
-- ৫) অ্যাক্সেস নিয়ম (RLS): শুধু অ্যাডমিন পড়তে, যোগ করতে, বদলাতে পারে — মুছতে কেউ না
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['members','entries','meals','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_select on public.%I', t);
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('create policy admin_select on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    -- ইচ্ছাকৃতভাবে DELETE policy নেই
    execute format('revoke all on public.%I from anon, public', t);
    execute format('revoke delete, truncate on public.%I from authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
drop policy if exists admin_select on public.audit_log;
create policy admin_select on public.audit_log for select to authenticated using (public.is_admin());
revoke all on public.audit_log from anon, public;
revoke insert, update, delete, truncate on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

revoke all on public.app_admin from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- শেষ। "Success. No rows returned" দেখালে সেটআপ সম্পূর্ণ।
-- ---------------------------------------------------------------------------
