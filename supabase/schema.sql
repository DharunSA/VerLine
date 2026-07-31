-- ============================================================
-- Verline — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- Trees table
create table if not exists trees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- People table
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  name text not null,
  gender text check (gender in ('male','female','other','unspecified')),
  dob date,
  dod date,
  photo_url text,
  profession text,
  location text,
  bio text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Relationships table
create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  type text not null check (type in ('PARENT_OF','SPOUSE_OF')),
  from_person_id uuid not null references people(id) on delete cascade,
  to_person_id uuid not null references people(id) on delete cascade,
  is_adopted boolean default false,
  is_divorced boolean default false,
  created_at timestamptz default now(),
  unique (tree_id, type, from_person_id, to_person_id)
);

-- Enable Row Level Security
alter table trees enable row level security;
alter table people enable row level security;
alter table relationships enable row level security;

-- RLS Policies: users can only read/write their own trees
create policy "Users can read own trees"
  on trees for select using (auth.uid() = owner_id);

create policy "Users can insert own trees"
  on trees for insert with check (auth.uid() = owner_id);

create policy "Users can update own trees"
  on trees for update using (auth.uid() = owner_id);

create policy "Users can delete own trees"
  on trees for delete using (auth.uid() = owner_id);

-- People policies (scoped to tree ownership)
create policy "Users can read people in own trees"
  on people for select using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can insert people in own trees"
  on people for insert with check (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can update people in own trees"
  on people for update using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can delete people in own trees"
  on people for delete using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

-- Relationships policies
create policy "Users can read relationships in own trees"
  on relationships for select using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can insert relationships in own trees"
  on relationships for insert with check (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can update relationships in own trees"
  on relationships for update using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

create policy "Users can delete relationships in own trees"
  on relationships for delete using (
    exists (select 1 from trees where id = tree_id and owner_id = auth.uid())
  );

-- Indexes for performance
create index if not exists idx_people_tree on people(tree_id);
create index if not exists idx_rel_tree on relationships(tree_id);
create index if not exists idx_rel_from on relationships(from_person_id);
create index if not exists idx_rel_to on relationships(to_person_id);
