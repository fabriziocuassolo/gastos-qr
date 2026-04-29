-- Ejecutar en Supabase > SQL Editor
create table if not exists expenses (
  id text primary key,
  owner_id text not null,
  amount numeric not null,
  place text not null,
  date date not null,
  category text,
  payment text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists expenses_owner_idx on expenses(owner_id);

-- Para esta versión simple NO actives RLS todavía.
-- Para multiusuario real/privado, lo correcto es usar Supabase Auth + RLS por user_id.
