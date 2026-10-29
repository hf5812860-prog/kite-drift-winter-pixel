import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isCode } from "@/lib/wasl/code";
import { dropCode, pauseCode, peekCode, pulseCode, syncRoblox } from "@/lib/wasl/links.server";

const codeSchema = z.string().refine(isCode, "invalid code");

const pulseSchema = z.object({
  op: z.literal("pulse"),
  code: codeSchema,
  on: z.boolean(),
});

const peekSchema = z.object({
  op: z.literal("peek"),
  code: codeSchema,
});

const pauseSchema = z.object({
  op: z.literal("pause"),
  code: codeSchema,
});

const dropSchema = z.object({
  op: z.literal("drop"),
  code: codeSchema,
});

const playerSchema = z.object({
  code: codeSchema,
  username: z.string().trim().min(1).max(32),
  userId: z
    .union([z.string().regex(/^-?\d{1,20}$/), z.number().int()])
    .transform((value) => String(value)),
  muted: z.boolean().optional().default(false),
  x: z.number().finite().optional().default(0),
  y: z.number().finite().optional().default(0),
  z: z.number().finite().optional().default(0),
  placed: z.boolean().optional().default(false),
});

const syncSchema = z.object({
  op: z.literal("sync"),
  players: z.array(playerSchema).max(48),
});

const bodySchema = z.discriminatedUnion("op", [
  pulseSchema,
  peekSchema,
  pauseSchema,
  dropSchema,
  syncSchema,
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handle({ request }: { request: Request }): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  try {
    const msg = parsed.data;
    if (msg.op === "peek") {
      const result = await peekCode(msg.code);
      if ("gone" in result) return json({ ok: false, gone: true });
      return json({ ok: true, username: result.username });
    }
    if (msg.op === "pulse") {
      const result = await pulseCode(msg.code, msg.on);
      if ("gone" in result && result.gone) return json({ ok: false, gone: true });
      return json({ ok: true, ...result });
    }
    if (msg.op === "pause") {
      await pauseCode(msg.code);
      return json({ ok: true });
    }
    if (msg.op === "drop") {
      await dropCode(msg.code);
      return json({ ok: true });
    }
    const players = await syncRoblox(msg.players);
    return json({ ok: true, players });
  } catch (error) {
    console.error("[wasl] request failed:", error);
    return json({ error: "unavailable" }, 500);
  }
}

export const Route = createFileRoute("/api/wasl")({
  server: { handlers: { POST: handle } },
});
