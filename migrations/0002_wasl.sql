-- Ephemeral link between a Roblox callsign and a browser mic.
-- Codes are random room tokens, not accounts. No names or user ids.
create table if not exists wasl_links (
  code         text primary key,
  mic_on       boolean not null default false,
  roblox_seen  timestamptz,
  web_seen     timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists wasl_links_seen_idx
  on wasl_links (web_seen, roblox_seen);
