import { getSql, type Sql } from "@/lib/db";
import { touchVoicePeer } from "@/lib/multiplayer/signaling.server";

const FRESH_ROBLOX_SECONDS = 20;
const FRESH_WEB_SECONDS = 15;
const STALE_SECONDS = 180;

export type VoicePeer = {
  code: string;
  username: string;
  x: number;
  y: number;
  z: number;
  muted: boolean;
  micOn: boolean;
  placed: boolean;
};

export type PulseState = {
  gone: false;
  username: string;
  muted: boolean;
  linked: boolean;
  x: number;
  y: number;
  z: number;
  placed: boolean;
  players: VoicePeer[];
};

type RobloxPlayer = {
  code: string;
  username: string;
  userId: string;
  muted: boolean;
  x: number;
  y: number;
  z: number;
  placed: boolean;
};

function flag(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function prune(sql: Sql) {
  await sql.query(
    `DELETE FROM wasl_links
     WHERE coalesce(web_seen, to_timestamp(0)) < now() - make_interval(secs => $1)
       AND coalesce(roblox_seen, to_timestamp(0)) < now() - make_interval(secs => $1)`,
    [STALE_SECONDS],
  );
}

type LinkRow = {
  code: string;
  username: string;
  muted: boolean;
  mic_on: boolean;
  pos_x: unknown;
  pos_y: unknown;
  pos_z: unknown;
  placed: boolean;
  linked: boolean;
  web_live: boolean;
};

function toPeer(row: LinkRow): VoicePeer {
  return {
    code: row.code,
    username: row.username,
    x: num(row.pos_x),
    y: num(row.pos_y),
    z: num(row.pos_z),
    muted: flag(row.muted),
    micOn: flag(row.mic_on) && flag(row.web_live),
    placed: flag(row.placed),
  };
}

/** Code must already exist from the Roblox server. Does not create one. */
export async function peekCode(code: string): Promise<{ username: string } | { gone: true }> {
  const sql = await getSql();
  const rows = await sql.query<{ username: string }>(
    `SELECT username FROM wasl_links
     WHERE code = $1
       AND roblox_seen IS NOT NULL
       AND roblox_seen > now() - make_interval(secs => $2)`,
    [code, FRESH_ROBLOX_SECONDS],
  );
  const row = rows[0];
  if (!row) return { gone: true };
  return { username: row.username };
}

export async function pulseCode(code: string, micOn: boolean): Promise<PulseState | { gone: true }> {
  const sql = await getSql();
  if (Math.random() < 0.15) await prune(sql);
  const updated = await sql.query<LinkRow>(
    `UPDATE wasl_links
     SET mic_on = $2, web_seen = now()
     WHERE code = $1
       AND roblox_seen IS NOT NULL
       AND roblox_seen > now() - make_interval(secs => $3)
     RETURNING code, username, muted, mic_on, pos_x, pos_y, pos_z, placed,
       true AS linked,
       true AS web_live`,
    [code, micOn, FRESH_ROBLOX_SECONDS],
  );
  const self = updated[0];
  if (!self) return { gone: true };
  try {
    await touchVoicePeer(code, self.username || code);
  } catch (error) {
    console.error("[wasl] voice roster failed", error);
  }
  const others = await sql.query<LinkRow>(
    `SELECT code, username, muted, mic_on, pos_x, pos_y, pos_z, placed,
            (
              roblox_seen IS NOT NULL
              AND roblox_seen > now() - make_interval(secs => $2)
            ) AS linked,
            (
              web_seen IS NOT NULL
              AND web_seen > now() - make_interval(secs => $3)
            ) AS web_live
     FROM wasl_links
     WHERE code <> $1
       AND roblox_seen IS NOT NULL
       AND roblox_seen > now() - make_interval(secs => $2)`,
    [code, FRESH_ROBLOX_SECONDS, FRESH_WEB_SECONDS],
  );
  const me = toPeer(self);
  return {
    gone: false,
    username: me.username,
    muted: me.muted,
    linked: true,
    x: me.x,
    y: me.y,
    z: me.z,
    placed: me.placed,
    players: others.map(toPeer),
  };
}

/** Browser tab closed. Keeps the code until the player leaves the game. */
export async function pauseCode(code: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`UPDATE wasl_links SET mic_on = false, web_seen = now() WHERE code = $1`, [code]);
}

/** Player left the experience. The code is gone. */
export async function dropCode(code: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`DELETE FROM wasl_links WHERE code = $1`, [code]);
}

export async function syncRoblox(
  players: RobloxPlayer[],
): Promise<Array<{ code: string; linked: boolean }>> {
  const unique = players.slice(0, 48);
  if (unique.length === 0) return [];
  const sql = await getSql();
  await prune(sql);
  for (const player of unique) {
    if (player.userId) {
      await sql.query(`DELETE FROM wasl_links WHERE user_id = $1 AND code <> $2`, [
        player.userId,
        player.code,
      ]);
    }
    await sql.query(
      `INSERT INTO wasl_links (code, username, user_id, muted, pos_x, pos_y, pos_z, placed, mic_on, roblox_seen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, now())
       ON CONFLICT (code) DO UPDATE
         SET username = EXCLUDED.username,
             user_id = EXCLUDED.user_id,
             muted = EXCLUDED.muted,
             pos_x = EXCLUDED.pos_x,
             pos_y = EXCLUDED.pos_y,
             pos_z = EXCLUDED.pos_z,
             placed = EXCLUDED.placed,
             roblox_seen = now()`,
      [player.code, player.username, player.userId, player.muted, player.x, player.y, player.z, player.placed],
    );
  }
  const placeholders = unique.map((_, index) => `$${index + 2}`).join(", ");
  const rows = await sql.query<{ code: string; live: boolean }>(
    `SELECT code,
            (
              mic_on
              AND web_seen IS NOT NULL
              AND web_seen > now() - make_interval(secs => $1)
            ) AS live
     FROM wasl_links
     WHERE code IN (${placeholders})`,
    [FRESH_WEB_SECONDS, ...unique.map((player) => player.code)],
  );
  const live = new Map(rows.map((row) => [row.code, flag(row.live)]));
  return unique.map((player) => ({ code: player.code, linked: live.get(player.code) === true }));
}
