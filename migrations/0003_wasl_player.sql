-- One live code per Roblox player: identity, mute, and position for proximity.
alter table wasl_links add column if not exists username text not null default '';
alter table wasl_links add column if not exists user_id text not null default '';
alter table wasl_links add column if not exists muted boolean not null default false;
alter table wasl_links add column if not exists pos_x double precision not null default 0;
alter table wasl_links add column if not exists pos_y double precision not null default 0;
alter table wasl_links add column if not exists pos_z double precision not null default 0;

create index if not exists wasl_links_user_id_idx on wasl_links (user_id);
