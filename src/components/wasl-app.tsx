import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Headphones, KeyRound, Loader2, Mic, Radio } from "lucide-react";
import { LevelMeter } from "@/components/level-meter";
import { P2PRoom } from "@/lib/multiplayer/p2p";
import { browserApiPath, browserPublicBase } from "@/lib/preview-path-prefix";
import { formatCodeInput, isCode } from "@/lib/wasl/code";
import { clientScript, serverScript } from "@/lib/wasl/roblox-scripts";

const ROOM = "wasl";
const FULL_RANGE = 28;
const MAX_RANGE = 80;

type Phase = "idle" | "joining" | "live" | "ended";
type CopyKey = "server" | "client" | "code";
type Pos = { x: number; y: number; z: number };
type HeardPlayer = Pos & {
  code: string;
  username: string;
  muted: boolean;
  micOn: boolean;
  placed: boolean;
};

function micError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "المتصفح منع المايك. اسمح له من علامة القفل جنب العنوان، ثم أعد المحاولة.";
    }
    if (err.name === "NotFoundError") return "ما لقينا مايك على الجهاز.";
    if (err.name === "NotReadableError") return "المايك مستخدم من برنامج ثاني. سكّره وجرّب.";
  }
  if (err instanceof Error && err.message && !err.message.startsWith("Failed to")) return err.message;
  return "ما قدرنا نفتح المايك.";
}

function proximityGain(from: Pos, to: Pos): number {
  const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
  if (distance <= FULL_RANGE) return 1;
  if (distance >= MAX_RANGE) return 0;
  return 1 - (distance - FULL_RANGE) / (MAX_RANGE - FULL_RANGE);
}

function hearLabel(player: HeardPlayer, gain: number, hearing: boolean): string {
  if (!player.placed) return "مو واقف داخل الماب";
  if (!player.micOn) return "ما فتح المايك من الموقع";
  if (player.muted) return "كاتم من داخل اللعبة";
  if (gain <= 0) return "بعيد — ما تسمعه";
  if (!hearing) return "قريب، بس الصوت ما وصل بعد";
  if (gain < 0.99) return "يبعد وصوته واطي";
  return "قريب وتسمعه";
}

function hearGain(selfPlaced: boolean, self: Pos, peer: HeardPlayer | undefined): number {
  if (!selfPlaced || !peer?.placed || !peer.micOn || peer.muted) return 0;
  return proximityGain(self, peer);
}

function RemoteVoice({ stream, gain }: { stream: MediaStream; gain: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.volume = gain > 0 ? Math.min(1, gain) : 0;
    if (gain > 0) void el.play().catch(() => {});
    return () => {
      el.pause();
      el.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = gain > 0 ? Math.min(1, gain) : 0;
    if (gain <= 0) {
      el.pause();
      return;
    }
    void el.play().catch(() => {});
  }, [gain]);
  return <audio ref={ref} autoPlay playsInline />;
}

function Mark() {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center" aria-hidden="true">
      <span className="wasl-ring absolute inset-0 rounded-full border border-brass" />
      <span className="wasl-ring wasl-ring-late absolute inset-2 rounded-full border border-brass" />
      <span className="h-3 w-3 rounded-full bg-brass" />
    </span>
  );
}

function BadgePreview() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-brass text-brass-ink" aria-hidden="true">
      <Mic className="h-5 w-5" strokeWidth={2.4} />
    </span>
  );
}

async function postWasl(body: unknown): Promise<Response> {
  return fetch(browserApiPath("/api/wasl"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function WaslApp() {
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [muted, setMuted] = useState(false);
  const [selfPos, setSelfPos] = useState<Pos>({ x: 0, y: 0, z: 0 });
  const [selfPlaced, setSelfPlaced] = useState(false);
  const [players, setPlayers] = useState<HeardPlayer[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [manual, setManual] = useState<{ title: string; text: string } | null>(null);
  const [base, setBase] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    setBase(browserPublicBase());
  }, []);

  useEffect(() => {
    if (!stream) return;
    for (const track of stream.getAudioTracks()) track.enabled = !muted;
  }, [stream, muted]);

  useEffect(() => {
    if (phase !== "live" || !code) return;
    let cancel = false;
    const beat = async () => {
      try {
        const res = await postWasl({ op: "pulse", code, on: true });
        const data = (await res.json()) as {
          gone?: boolean;
          username?: string;
          muted?: boolean;
          placed?: boolean;
          x?: number;
          y?: number;
          z?: number;
          players?: HeardPlayer[];
        };
        if (cancel) return;
        if (!res.ok || data.gone) {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          void audioCtx?.close();
          setAudioCtx(null);
          setRemotes({});
          setStream(null);
          setPhase("ended");
          return;
        }
        setUsername(data.username ?? "");
        setMuted(data.muted === true);
        setSelfPlaced(data.placed === true);
        setSelfPos({ x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 });
        setPlayers(data.players ?? []);
      } catch {
        // Next beat retries.
      }
    };
    void beat();
    const id = window.setInterval(() => void beat(), 1000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [phase, code]);

  useEffect(() => {
    if (phase !== "live" || !stream || !code) return;
    let dead = false;
    const room = new P2PRoom({
      room: ROOM,
      selfId: code,
      name: code,
      localStream: stream,
      onPeersChanged: (list) => {
        if (dead) return;
        const next: Record<string, string> = {};
        for (const peer of list) next[peer.id] = peer.connectionState;
        setLinks(next);
      },
      onRemoteStream: (id, remote) => {
        if (dead) return;
        setRemotes((prev) => (prev[id] === remote ? prev : { ...prev, [id]: remote }));
      },
      onRemoteStreamEnd: (id) => {
        setRemotes((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
    });
    void room.join();
    return () => {
      dead = true;
      room.close();
    };
  }, [phase, stream, code]);

  useEffect(() => {
    const stops: Array<() => void> = [];
    for (const [id, remote] of Object.entries(remotes)) {
      const mark = () => {
        const live = remote.getAudioTracks().some((track) => track.readyState === "live" && !track.muted);
        setHeard((prev) => (prev[id] === live ? prev : { ...prev, [id]: live }));
      };
      mark();
      for (const track of remote.getAudioTracks()) {
        track.addEventListener("unmute", mark);
        track.addEventListener("mute", mark);
        track.addEventListener("ended", mark);
        stops.push(() => {
          track.removeEventListener("unmute", mark);
          track.removeEventListener("mute", mark);
          track.removeEventListener("ended", mark);
        });
      }
    }
    return () => {
      for (const stop of stops) stop();
    };
  }, [remotes]);

  useEffect(() => {
    if (phase !== "live" || !code) return;
    const pause = () => {
      void fetch(browserApiPath("/api/wasl"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "pause", code }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("pagehide", pause);
    return () => window.removeEventListener("pagehide", pause);
  }, [phase, code]);

  async function enter(nextCode: string) {
    setError("");
    if (!isCode(nextCode)) {
      setError("الكود ٨ خانات، مثل K7M2-Q4NP، ويطلع من زر كودي في اللعبة.");
      return;
    }
    setPhase("joining");
    const ctx = new AudioContext();
    void ctx.resume();
    setAudioCtx(ctx);
    const unlock = new Audio();
    unlock.muted = true;
    void unlock.play().catch(() => {});
    let mic: MediaStream | null = null;
    try {
      const peekRes = await postWasl({ op: "peek", code: nextCode });
      const peeked = (await peekRes.json()) as { gone?: boolean; username?: string };
      if (!peekRes.ok || peeked.gone) {
        throw new Error("اللعبة ما أرسلت هذا الكود. في إعدادات Security اضغط Save بعد تفعيل HTTP، أوقف Play ثم شغّله، والصق سكربت السيرفر من جديد. القائمة تطلع سبب الرفض.");
      }
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const res = await postWasl({ op: "pulse", code: nextCode, on: true });
      const data = (await res.json()) as {
        gone?: boolean;
        username?: string;
        muted?: boolean;
        placed?: boolean;
        x?: number;
        y?: number;
        z?: number;
        players?: HeardPlayer[];
      };
      if (!res.ok || data.gone) throw new Error("الربط انقطع. ارجع للعبة وخذ الكود من جديد.");
      setStream(mic);
      setCode(nextCode);
      setUsername(data.username || peeked.username || "");
      setMuted(data.muted === true);
      setSelfPlaced(data.placed === true);
      setSelfPos({ x: data.x ?? 0, y: data.y ?? 0, z: data.z ?? 0 });
      setPlayers(data.players ?? []);
      setRemotes({});
      setPhase("live");
    } catch (err) {
      mic?.getTracks().forEach((track) => track.stop());
      void ctx.close();
      setAudioCtx(null);
      setPhase("idle");
      setError(micError(err));
    }
  }

  function stopPage() {
    stream?.getTracks().forEach((track) => track.stop());
    void audioCtx?.close();
    setAudioCtx(null);
    const active = code;
    setStream(null);
    setRemotes({});
    setPlayers([]);
    setPhase("idle");
    if (active) {
      void postWasl({ op: "pause", code: active }).catch(() => {});
    }
  }

  async function copyText(key: CopyKey, title: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      setCopied(key);
    } catch {
      setManual({ title, text });
      setCopied(null);
    }
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
  }

  const origin = base || "https://example.grok.me";
  const httpOnly = base.startsWith("http://");

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 py-6 pb-24 sm:px-6">
      <header className="flex items-center gap-4">
        <Mark />
        <div className="min-w-0">
          <p className="font-display text-3xl leading-none text-fg">وَصْل</p>
          <p className="mt-1 text-sm text-muted">المايك من هنا، والكلام من داخل روبلوكس</p>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
        <section className="min-w-0 lg:col-span-3">
          {phase === "ended" ? (
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
              <p className="text-sm font-medium text-brass">انقطع</p>
              <h1 className="mt-2 font-display text-3xl text-fg">طلع من اللعبة</h1>
              <p className="mt-3 text-base leading-relaxed text-muted">
                الكود انحذف والمايك توقف. إذا رجع يبغى يتكلم، يضغط كودي من جديد ويلصق الكود هنا.
              </p>
              <button
                type="button"
                className="mt-6 h-12 rounded-2xl bg-brass px-5 text-sm font-semibold text-brass-ink"
                onClick={() => {
                  setDraft("");
                  setCode("");
                  setUsername("");
                  setPhase("idle");
                }}
              >
                اربط كود جديد
              </button>
            </div>
          ) : phase !== "live" ? (
            <form
              className="rounded-3xl border border-line bg-surface p-5 sm:p-7"
              onSubmit={(event) => {
                event.preventDefault();
                void enter(draft);
              }}
            >
              <p className="text-sm font-medium text-brass">ربط اللاعب</p>
              <h1 className="mt-2 text-balance font-display text-3xl leading-tight text-fg sm:text-4xl">
                الصق كود اللاعب عشان ينفتح مايكه في روبلوكس
              </h1>
              <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted">
                الكود واحد ومربوط بحسابه. بعد الربط القائمة في اللعبة تقول مربوط، وتقدر تكتم أو تفتح من هناك. اللي بعيد ما ينسمع.
              </p>

              <label className="mt-6 block text-sm text-muted" htmlFor="wasl-code">
                كود اللاعب
              </label>
              <input
                id="wasl-code"
                value={draft}
                onChange={(event) => setDraft(formatCodeInput(event.target.value))}
                dir="ltr"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="K7M2-Q4NP"
                maxLength={9}
                className="mt-2 h-14 w-full rounded-2xl border border-line bg-bg px-4 text-center font-display text-2xl tracking-widest text-fg placeholder:text-line"
              />

              {error ? (
                <p className="mt-3 text-sm leading-relaxed text-brass" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={phase === "joining" || !isCode(draft)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brass px-4 text-base font-semibold text-brass-ink disabled:opacity-40"
              >
                {phase === "joining" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                {phase === "joining" ? "نفتح المايك…" : "اربط وافتح المايك"}
              </button>

              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                <Fact icon={<KeyRound className="h-4 w-4" />} text="كود واحد لحسابه" />
                <Fact icon={<Mic className="h-4 w-4" />} text="الكتم من اللعبة" />
                <Fact icon={<Radio className="h-4 w-4" />} text="البعيد ما ينسمع" />
              </ul>
            </form>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brass">مربوط</p>
                  <p className="mt-1 truncate font-display text-3xl text-fg" dir="ltr">
                    @{username || "player"}
                  </p>
                  <button
                    type="button"
                    dir="ltr"
                    className="mt-1 font-display text-xl tracking-widest text-muted"
                    onClick={() => void copyText("code", "الكود", code)}
                  >
                    {code}
                  </button>
                  <p className="mt-1 text-xs text-muted">{copied === "code" ? "تم نسخ الكود" : "اضغط الكود عشان ينسخ"}</p>
                </div>
                <BadgePreview />
              </div>

              <div className="mt-5 rounded-2xl bg-bg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-fg">{muted ? "المايك مكتوم من اللعبة" : "المايك شغّال في اللعبة"}</p>
                    <p className="text-xs leading-relaxed text-muted">الكتم والفتح من زر القائمة يسار، مو من هنا.</p>
                  </div>
                  <LevelMeter stream={stream} active={!muted} />
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-semibold text-fg">اللاعبين</h2>
                {players.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {selfPlaced
                      ? "ما فيه لاعب ثاني قريب. الصوت يطلع فقط إذا وقفت جنبه داخل الماب."
                      : "ادخل الماب وخل شخصيتك ظاهرة. الصفحة ما تشغّل صوت لحالها."}
                  </p>
                ) : (
                  <ul className="mt-3 grid gap-2">
                    {players.map((player) => {
                      const gain = hearGain(selfPlaced, selfPos, player);
                      const hearing = heard[player.code] === true && links[player.code] === "connected";
                      return (
                        <li key={player.code} className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-fg" dir="ltr">
                              @{player.username || player.code}
                            </p>
                            <p className="text-xs text-muted">{hearLabel(player, gain, hearing)}</p>
                          </div>
                          <LevelMeter stream={remotes[player.code] ?? null} active={hearing && gain > 0} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Headphones className="mt-0.5 h-4 w-4 shrink-0" />
                خلّ الصفحة مفتوحة بالخلفية وحط سماعة. ما تسمع إلا اللاعب القريب منك داخل الماب، وإذا طلعت ينقطع الصوت والمايك. الصفحة ما تشغّل غرفة للكل.
              </p>

              <button
                type="button"
                className="mt-4 h-12 w-full rounded-2xl border border-line text-sm font-medium text-fg"
                onClick={stopPage}
              >
                اقفل المايك هنا
              </button>

              {Object.entries(remotes).map(([id, remote]) => (
                <RemoteVoice
                  key={id}
                  stream={remote}
                  gain={hearGain(
                    selfPlaced,
                    selfPos,
                    players.find((item) => item.code === id),
                  )}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="min-w-0 lg:col-span-2">
          <div className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="font-display text-2xl text-fg">سكربت اللعبة</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              حق لعبتك في استوديو روبلوكس. كود واحد لكل لاعب، وزر كتم، وعلامة مايك فوق الراس إذا المايك مفتوح.
            </p>

            <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-fg">
              <Step n="١" text="انسخ سكربت السيرفر وحطه في ServerScriptService." />
              <Step n="٢" text="انسخ سكربت اللاعب وحطه في StarterPlayerScripts." />
              <Step n="٣" text="من Game Settings فعّل Allow HTTP Requests." />
              <Step n="٤" text="الكود يطلع لحاله من آيدي اللاعب. انسخه والصقه هنا. إذا ما تعرّف، القائمة تكتب إن HTTP مقفل." />
            </ol>

            <div className="mt-4 grid gap-2">
              <CopyButton
                copied={copied === "server"}
                label="نسخ سكربت السيرفر"
                onClick={() => void copyText("server", "سكربت السيرفر", serverScript(origin))}
              />
              <CopyButton
                copied={copied === "client"}
                label="نسخ سكربت اللاعب"
                onClick={() => void copyText("client", "سكربت اللاعب", clientScript())}
              />
            </div>
            {httpOnly ? (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                روبلوكس يتصل فقط برابط https. بعد النشر انسخ سكربت السيرفر من الموقع المنشور.
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-bg p-3">
              <BadgePreview />
              <div>
                <p className="text-sm font-semibold text-fg">علامة فوق الرأس</p>
                <p className="text-xs leading-relaxed text-muted">تظهر إذا اللاعب مربوط والمايك مفتوح، وتختفي إذا كتم أو طلع.</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-bg p-3" aria-hidden="true">
              <p className="text-xs text-muted">معاينة القائمة يسار</p>
              <div className="mt-2 w-44 rounded-2xl bg-surface p-3">
                <p className="font-display text-lg text-fg">وصل</p>
                <p className="text-xs text-brass" dir="ltr">
                  @player
                </p>
                <div className="mt-2 rounded-xl bg-brass py-2 text-center text-xs font-semibold text-brass-ink">كودي</div>
                <p dir="ltr" className="mt-2 rounded-xl bg-bg py-2 text-center font-display tracking-widest text-brass">
                  K7M2-Q4NP
                </p>
                <div className="mt-2 rounded-xl bg-raised py-2 text-center text-xs text-fg">كتم المايك</div>
              </div>
            </div>

            <details className="mt-4">
              <summary className="text-sm text-muted">عرض السكربتات</summary>
              <pre
                dir="ltr"
                className="mt-3 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted"
              >
                {serverScript(origin)}
              </pre>
              <pre
                dir="ltr"
                className="mt-2 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted"
              >
                {clientScript()}
              </pre>
            </details>
          </div>
        </aside>
      </div>

      {manual ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-fg">انسخ {manual.title} يدويًا</p>
          <textarea
            readOnly
            dir="ltr"
            value={manual.text}
            className="mt-3 h-48 w-full rounded-2xl bg-bg p-3 text-left text-xs text-fg"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </main>
  );
}

function Fact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-bg px-3 py-3 text-xs text-muted">
      <span className="text-brass">{icon}</span>
      {text}
    </li>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised font-display text-brass">{n}</span>
      <span className="pt-0.5">{text}</span>
    </li>
  );
}

function CopyButton({ label, copied, onClick }: { label: string; copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brass text-sm font-semibold text-brass-ink"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "تم النسخ" : label}
    </button>
  );
}
