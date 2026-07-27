create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(150) unique not null,
  password_hash varchar(255) not null,
  preference_mode varchar(30) default 'eco',
  created_at timestamp with time zone default now()
);

create index if not exists users_email_idx on users (email);
