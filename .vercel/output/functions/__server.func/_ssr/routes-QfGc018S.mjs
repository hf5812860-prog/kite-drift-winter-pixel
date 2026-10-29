import { o as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as KeyRound, c as Check, i as LoaderCircle, n as Radio, o as Headphones, r as Mic, s as Copy } from "../_libs/lucide-react.mjs";
import { a as browserPublicBase, i as browserApiPath, n as formatCodeInput, r as isCode } from "./router-XerMOWBY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-QfGc018S.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BARS = 12;
function LevelMeter({ stream, active }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const root = ref.current;
		const bars = root ? [...root.querySelectorAll("[data-bar]")] : [];
		const rest = () => {
			for (const bar of bars) bar.style.transform = "scaleY(0.16)";
		};
		if (!root || !stream || !active) {
			rest();
			return;
		}
		const audio = new AudioContext();
		audio.resume();
		const source = audio.createMediaStreamSource(stream);
		const analyser = audio.createAnalyser();
		analyser.fftSize = 64;
		source.connect(analyser);
		const bins = new Uint8Array(analyser.frequencyBinCount);
		let raf = 0;
		let last = 0;
		const tick = (time) => {
			raf = requestAnimationFrame(tick);
			if (time - last < 70) return;
			last = time;
			analyser.getByteFrequencyData(bins);
			bars.forEach((bar, index) => {
				const start = Math.floor(index / bars.length * bins.length);
				const end = Math.max(start + 1, Math.floor((index + 1) / bars.length * bins.length));
				let sum = 0;
				for (let i = start; i < end; i++) sum += bins[i] ?? 0;
				const avg = sum / (end - start) / 255;
				bar.style.transform = `scaleY(${(.16 + avg * .84).toFixed(3)})`;
			});
		};
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			source.disconnect();
			audio.close();
			rest();
		};
	}, [stream, active]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "flex h-8 items-end gap-1",
		"aria-hidden": "true",
		children: Array.from({ length: BARS }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"data-bar": "",
			className: "h-full w-1 origin-bottom rounded-full bg-brass",
			style: { transform: "scaleY(0.16)" }
		}, index))
	});
}
/**
* Full-mesh WebRTC rooms: one RTCPeerConnection per remote peer, signaled
* through /api/rtc (see signaling.server.ts), media and game data flowing
* directly browser-to-browser afterwards.
*
* Negotiation follows the "perfect negotiation" pattern: on a glare (both
* sides offering at once) the polite peer — the lexicographically smaller id —
* rolls back and accepts, so pairs converge without wedging.
*/
var FAST_POLL_MS = 400;
var IDLE_POLL_MS = 2e3;
var PING_INTERVAL_MS = 2e3;
var STALL_MS = 1e4;
var MAX_RECOVERY_ATTEMPTS = 3;
var SIGNAL_RETRY_DELAYS_MS = [250, 750];
function defaultIceServers() {
	return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];
}
var P2PRoom = class {
	opts;
	peers = /* @__PURE__ */ new Map();
	signalQueues = /* @__PURE__ */ new Map();
	cursor = 0;
	pollTimer = null;
	pingTimer = null;
	closed = false;
	everPolled = false;
	lastPeersFingerprint = "";
	constructor(opts) {
		this.opts = opts;
	}
	async join() {
		try {
			await this.pollOnce();
		} catch {}
		if (this.closed) return;
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
		this.pingTimer = setInterval(() => {
			this.pingAll();
			this.watchdog();
		}, PING_INTERVAL_MS);
	}
	close() {
		this.closed = true;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		if (this.pingTimer) clearInterval(this.pingTimer);
		for (const [id, slot] of this.peers) {
			slot.pc.close();
			this.opts.onRemoteStreamEnd?.(id);
		}
		this.peers.clear();
		fetch(browserApiPath("/api/rtc"), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				op: "leave",
				room: this.opts.room,
				peer: this.opts.selfId
			}),
			keepalive: true
		}).catch(() => {});
	}
	broadcast(data) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		for (const slot of this.peers.values()) if (slot.state?.readyState === "open") slot.state.send(wire);
	}
	send(data, peerId) {
		const wire = JSON.stringify({
			t: "d",
			d: data
		});
		const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
		for (const slot of targets) if (slot?.reliable?.readyState === "open") slot.reliable.send(wire);
	}
	peerList() {
		return [...this.peers.values()].map((s) => ({ ...s.info }));
	}
	schedulePoll(delay) {
		if (this.closed) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);
		this.pollTimer = setTimeout(() => void this.poll(), delay);
	}
	anyPairConnecting() {
		for (const s of this.peers.values()) {
			if (s.terminal) continue;
			if (s.info.connectionState !== "connected") return true;
		}
		return false;
	}
	async pollOnce() {
		const params = new URLSearchParams({
			room: this.opts.room,
			peer: this.opts.selfId,
			name: this.opts.name ?? "",
			since: String(this.cursor)
		});
		const res = await fetch(`${browserApiPath("/api/rtc")}?${params}`);
		if (this.closed) return;
		if (!res.ok) throw new Error(`signaling poll failed: ${res.status}`);
		const body = await res.json();
		if (this.closed) return;
		if (!this.everPolled) {
			this.everPolled = true;
			this.opts.onConnected?.();
		}
		this.reconcileRoster(body.peers);
		const roster = new Set(body.peers.map((p) => p.id));
		for (const sig of body.signals) {
			this.cursor = Math.max(this.cursor, sig.id);
			await this.onSignal(sig.from, sig.kind, sig.payload, roster);
			if (this.closed) return;
		}
	}
	async poll() {
		if (this.closed) return;
		try {
			await this.pollOnce();
		} catch {}
		this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
	}
	reconcileRoster(peers) {
		const alive = new Set(peers.map((p) => p.id));
		for (const p of peers) {
			if (p.id === this.opts.selfId) continue;
			const existing = this.peers.get(p.id);
			if (existing) existing.info.name = p.name;
			else this.connectTo(p.id, p.name, this.opts.selfId > p.id);
		}
		for (const [id, slot] of this.peers) if (!alive.has(id)) {
			slot.pc.close();
			this.peers.delete(id);
			this.opts.onRemoteStreamEnd?.(id);
		}
		this.emitPeers();
	}
	connectTo(peerId, name, initiator) {
		if (this.closed) return null;
		const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers ?? defaultIceServers() });
		const slot = {
			pc,
			makingOffer: false,
			ignoreOffer: false,
			pendingCandidates: [],
			lastProgressAt: Date.now(),
			recoveryAttempts: 0,
			info: {
				id: peerId,
				name,
				connectionState: pc.connectionState,
				candidateType: null,
				rttMs: null
			}
		};
		this.peers.set(peerId, slot);
		const stream = this.opts.localStream;
		if (stream) for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
		pc.ontrack = (event) => {
			const remote = event.streams[0] ?? new MediaStream([event.track]);
			this.opts.onRemoteStream?.(peerId, remote);
		};
		pc.onicecandidate = (e) => {
			if (e.candidate) this.sendSignal(peerId, "ice", e.candidate.toJSON());
		};
		pc.onconnectionstatechange = () => {
			slot.info.connectionState = pc.connectionState;
			if (pc.connectionState === "connecting" || pc.connectionState === "connected") slot.lastProgressAt = Date.now();
			if (pc.connectionState === "connected") {
				slot.recoveryAttempts = 0;
				slot.terminal = false;
				this.readCandidateType(slot);
			}
			this.emitPeers();
			if (pc.connectionState === "failed") pc.restartIce();
			if (pc.connectionState === "failed" || pc.connectionState === "disconnected") this.schedulePoll(FAST_POLL_MS);
		};
		pc.onnegotiationneeded = async () => {
			try {
				slot.makingOffer = true;
				await pc.setLocalDescription();
				await this.sendSignal(peerId, "offer", pc.localDescription.toJSON());
			} catch {} finally {
				slot.makingOffer = false;
			}
		};
		pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);
		if (initiator) {
			this.attachChannel(slot, pc.createDataChannel("state", {
				ordered: false,
				maxRetransmits: 0
			}));
			this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
		}
		return slot;
	}
	attachChannel(slot, channel) {
		if (channel.label === "state") slot.state = channel;
		else slot.reliable = channel;
		channel.onopen = () => {
			slot.lastProgressAt = Date.now();
		};
		channel.onmessage = (e) => {
			let msg;
			try {
				msg = JSON.parse(e.data);
			} catch {
				return;
			}
			if (msg.t === "ping") {
				if (slot.state?.readyState === "open") slot.state.send(JSON.stringify({ t: "pong" }));
			} else if (msg.t === "pong") {
				if (slot.pingSentAt) {
					slot.info.rttMs = Math.round(performance.now() - slot.pingSentAt);
					slot.pingSentAt = void 0;
					this.emitPeers();
				}
			} else this.opts.onMessage?.(slot.info.id, msg.d, channel.label === "state" ? "state" : "reliable");
		};
	}
	async flushPendingCandidates(slot) {
		while (slot.pendingCandidates.length > 0) {
			const candidate = slot.pendingCandidates.shift();
			try {
				await slot.pc.addIceCandidate(candidate);
			} catch (err) {
				if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
			}
			if (this.closed) return;
		}
	}
	async onSignal(from, kind, payload, roster) {
		if (this.closed) return;
		let slot = this.peers.get(from);
		if (!slot) {
			if (!roster.has(from)) return;
			const created = this.connectTo(from, "", false);
			if (!created) return;
			slot = created;
		}
		const polite = this.opts.selfId < from;
		try {
			if (kind === "offer" || kind === "answer") {
				const description = payload;
				const collision = kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
				slot.ignoreOffer = !polite && collision;
				if (slot.ignoreOffer) return;
				try {
					await slot.pc.setRemoteDescription(description);
				} catch (err) {
					if (kind !== "offer" || slot.recreatedForOffer) throw err;
					const attempts = slot.recoveryAttempts;
					const name = slot.info.name;
					slot.pc.close();
					this.peers.delete(from);
					this.opts.onRemoteStreamEnd?.(from);
					const fresh = this.connectTo(from, name, false);
					if (!fresh) return;
					fresh.recoveryAttempts = attempts;
					fresh.recreatedForOffer = true;
					slot = fresh;
					await slot.pc.setRemoteDescription(description);
				}
				if (this.closed) return;
				await this.flushPendingCandidates(slot);
				if (this.closed) return;
				if (kind === "offer") {
					await slot.pc.setLocalDescription();
					if (this.closed) return;
					await this.sendSignal(from, "answer", slot.pc.localDescription.toJSON());
				}
			} else if (kind === "ice") {
				const candidate = payload;
				if (!slot.pc.remoteDescription) {
					slot.pendingCandidates.push(candidate);
					return;
				}
				try {
					await slot.pc.addIceCandidate(candidate);
				} catch (err) {
					if (!slot.ignoreOffer) console.warn("[p2p] addIceCandidate failed:", err);
				}
			}
		} catch {}
	}
	sendSignal(to, kind, payload) {
		const next = (this.signalQueues.get(to) ?? Promise.resolve()).then(() => this.postSignal(to, kind, payload));
		this.signalQueues.set(to, next.catch(() => {}));
		return next;
	}
	async postSignal(to, kind, payload) {
		for (let attempt = 0;; attempt++) {
			if (this.closed) return;
			try {
				const res = await fetch(browserApiPath("/api/rtc"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						op: "signal",
						room: this.opts.room,
						from: this.opts.selfId,
						to,
						kind,
						payload
					})
				});
				if (res.ok) return;
				throw new Error(`signal POST failed: ${res.status}`);
			} catch (err) {
				if (attempt >= SIGNAL_RETRY_DELAYS_MS.length) {
					console.warn(`[p2p] signal ${kind} to ${to} failed after retries`, err);
					return;
				}
				await new Promise((r) => setTimeout(r, SIGNAL_RETRY_DELAYS_MS[attempt]));
			}
		}
	}
	pingAll() {
		const wire = JSON.stringify({ t: "ping" });
		for (const slot of this.peers.values()) {
			if (slot.state?.readyState !== "open") continue;
			const stale = slot.pingSentAt !== void 0 && performance.now() - slot.pingSentAt > 2 * PING_INTERVAL_MS;
			if (slot.pingSentAt === void 0 || stale) {
				slot.pingSentAt = performance.now();
				slot.state.send(wire);
			}
		}
	}
	watchdog() {
		if (this.closed) return;
		const now = Date.now();
		for (const [peerId, slot] of this.peers) {
			const live = slot.pc.connectionState;
			if (live !== slot.info.connectionState) {
				slot.info.connectionState = live;
				if (live === "connecting" || live === "connected") slot.lastProgressAt = now;
				this.emitPeers();
			}
			if (slot.terminal || live === "connected") continue;
			if (now - slot.lastProgressAt <= STALL_MS) continue;
			if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
				slot.terminal = true;
				this.emitPeers();
				continue;
			}
			slot.recoveryAttempts += 1;
			slot.lastProgressAt = now;
			if (this.opts.selfId > peerId) {
				const { name } = slot.info;
				const attempts = slot.recoveryAttempts;
				slot.pc.close();
				this.peers.delete(peerId);
				this.opts.onRemoteStreamEnd?.(peerId);
				const fresh = this.connectTo(peerId, name, true);
				if (fresh) fresh.recoveryAttempts = attempts;
				this.schedulePoll(FAST_POLL_MS);
			}
		}
	}
	async readCandidateType(slot) {
		try {
			const stats = await slot.pc.getStats();
			let selected;
			stats.forEach((s) => {
				if (s.type === "candidate-pair" && s.nominated) selected = s;
			});
			const localId = selected?.localCandidateId;
			if (localId) {
				const local = stats.get(localId);
				slot.info.candidateType = local?.candidateType ?? null;
				this.emitPeers();
			}
		} catch {}
	}
	emitPeers() {
		const list = this.peerList();
		const fingerprint = JSON.stringify(list.map((p) => [
			p.id,
			p.name,
			p.connectionState,
			p.candidateType,
			p.rttMs
		]));
		if (fingerprint === this.lastPeersFingerprint) return;
		this.lastPeersFingerprint = fingerprint;
		this.opts.onPeersChanged?.(list);
	}
};
/** Studio scripts for the owner's own game. Not an executor payload. */
function serverScript(origin) {
	return `-- وصل | سكربت السيرفر
-- حطه في ServerScriptService
-- لازم تفعّل Game Settings > Security > Allow HTTP Requests
-- كل لاعب له كود واحد مربوط بحسابه. إذا طلع من اللعبة ينحذف الكود.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API = "${origin.replace(/["\\\n\r]/g, "")}/api/wasl"
local ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
local rng = Random.new()

local remote = ReplicatedStorage:FindFirstChild("WaslCode")
if not remote then
	remote = Instance.new("RemoteEvent")
	remote.Name = "WaslCode"
	remote.Parent = ReplicatedStorage
end

local codes = {}
local mutes = {}

local function makeCode()
	local s = ""
	for i = 1, 8 do
		local n = rng:NextInteger(1, #ALPH)
		s ..= string.sub(ALPH, n, n)
		if i == 4 then
			s ..= "-"
		end
	end
	return s
end

local function ensureCode(player)
	local existing = codes[player]
	if existing then
		return existing
	end
	local code = makeCode()
	codes[player] = code
	mutes[player] = false
	player:SetAttribute("WaslMuted", false)
	player:SetAttribute("WaslLinked", false)
	player:SetAttribute("WaslMic", false)
	return code
end

local function rootPosition(player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root then
		return 0, 0, 0
	end
	local position = root.Position
	return position.X, position.Y, position.Z
end

local function post(body)
	return HttpService:RequestAsync({
		Url = API,
		Method = "POST",
		Headers = { ["Content-Type"] = "application/json" },
		Body = HttpService:JSONEncode(body),
	})
end

local function drop(code)
	pcall(function()
		post({ op = "drop", code = code })
	end)
end

local function sync()
	local list = {}
	for player, code in pairs(codes) do
		if player.Parent == Players then
			local x, y, z = rootPosition(player)
			table.insert(list, {
				code = code,
				username = player.Name,
				userId = tostring(player.UserId),
				muted = mutes[player] == true,
				x = x,
				y = y,
				z = z,
			})
		else
			codes[player] = nil
			mutes[player] = nil
		end
	end
	if #list == 0 then
		return
	end

	local ok, result = pcall(function()
		return post({ op = "sync", players = list })
	end)
	if not ok or typeof(result) ~= "table" or result.Success ~= true or result.StatusCode ~= 200 then
		return
	end

	local decodedOk, decoded = pcall(function()
		return HttpService:JSONDecode(result.Body)
	end)
	if not decodedOk or typeof(decoded) ~= "table" or typeof(decoded.players) ~= "table" then
		return
	end

	local linkedByCode = {}
	for _, row in ipairs(decoded.players) do
		if typeof(row) == "table" and typeof(row.code) == "string" then
			linkedByCode[row.code] = row.linked == true
		end
	end

	for player, code in pairs(codes) do
		if player.Parent == Players then
			local linked = linkedByCode[code] == true
			local muted = mutes[player] == true
			player:SetAttribute("WaslLinked", linked)
			player:SetAttribute("WaslMuted", muted)
			player:SetAttribute("WaslMic", linked and not muted)
		end
	end
end

remote.OnServerEvent:Connect(function(player, action, value)
	if action == "want" then
		local code = ensureCode(player)
		remote:FireClient(player, "code", code)
		task.spawn(sync)
	elseif action == "mute" and typeof(value) == "boolean" and codes[player] then
		mutes[player] = value
		local linked = player:GetAttribute("WaslLinked") == true
		player:SetAttribute("WaslMuted", value)
		player:SetAttribute("WaslMic", linked and not value)
		task.spawn(sync)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	local code = codes[player]
	codes[player] = nil
	mutes[player] = nil
	if code then
		task.spawn(drop, code)
	end
end)

task.spawn(function()
	while true do
		task.wait(1)
		sync()
	end
end)
`;
}
function clientScript() {
	return `-- وصل | سكربت اللاعب
-- حطه في StarterPlayer > StarterPlayerScripts
-- كود واحد مربوط بحسابك. الكتم والقرب من هنا، والمايك ينفتح من الموقع.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remote = ReplicatedStorage:WaitForChild("WaslCode", 25)

local BRASS = Color3.fromRGB(226, 162, 58)
local INK = Color3.fromRGB(20, 18, 14)
local IVORY = Color3.fromRGB(243, 239, 228)
local MUTED = Color3.fromRGB(183, 173, 158)
local PANEL = Color3.fromRGB(30, 27, 22)

local currentCode = ""

local function mountBadge(target)
	local character = target.Character
	if not character then
		return
	end
	local head = character:FindFirstChild("Head")
	if not head then
		return
	end
	local old = head:FindFirstChild("WaslMic")
	if old then
		old:Destroy()
	end
	if target:GetAttribute("WaslMic") ~= true then
		return
	end

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "WaslMic"
	billboard.Adornee = head
	billboard.AlwaysOnTop = true
	billboard.LightInfluence = 0
	billboard.MaxDistance = 90
	billboard.Size = UDim2.fromOffset(54, 54)
	billboard.StudsOffset = Vector3.new(0, 2.7, 0)

	local disc = Instance.new("Frame")
	disc.BackgroundColor3 = BRASS
	disc.BorderSizePixel = 0
	disc.Size = UDim2.fromScale(1, 1)
	disc.Parent = billboard
	local discCorner = Instance.new("UICorner")
	discCorner.CornerRadius = UDim.new(1, 0)
	discCorner.Parent = disc

	local body = Instance.new("Frame")
	body.AnchorPoint = Vector2.new(0.5, 0.5)
	body.Position = UDim2.fromScale(0.5, 0.42)
	body.Size = UDim2.fromOffset(14, 20)
	body.BackgroundColor3 = INK
	body.BorderSizePixel = 0
	body.Parent = disc
	local bodyCorner = Instance.new("UICorner")
	bodyCorner.CornerRadius = UDim.new(0, 7)
	bodyCorner.Parent = body

	local stem = Instance.new("Frame")
	stem.AnchorPoint = Vector2.new(0.5, 0)
	stem.Position = UDim2.fromScale(0.5, 0.62)
	stem.Size = UDim2.fromOffset(2, 8)
	stem.BackgroundColor3 = INK
	stem.BorderSizePixel = 0
	stem.Parent = disc

	local foot = Instance.new("Frame")
	foot.AnchorPoint = Vector2.new(0.5, 0)
	foot.Position = UDim2.fromScale(0.5, 0.76)
	foot.Size = UDim2.fromOffset(16, 3)
	foot.BackgroundColor3 = INK
	foot.BorderSizePixel = 0
	foot.Parent = disc
	local footCorner = Instance.new("UICorner")
	footCorner.CornerRadius = UDim.new(1, 0)
	footCorner.Parent = foot

	billboard.Parent = head
end

local function track(target)
	local function refresh()
		local character = target.Character
		if not character then
			return
		end
		local head = character:FindFirstChild("Head") or character:WaitForChild("Head", 8)
		if head then
			mountBadge(target)
		end
	end
	target:GetAttributeChangedSignal("WaslMic"):Connect(refresh)
	target.CharacterAdded:Connect(function()
		task.defer(refresh)
	end)
	if target.Character then
		task.defer(refresh)
	end
end

for _, other in Players:GetPlayers() do
	track(other)
end
Players.PlayerAdded:Connect(track)

local gui = Instance.new("ScreenGui")
gui.Name = "WaslGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

local panel = Instance.new("Frame")
panel.AnchorPoint = Vector2.new(0, 0.5)
panel.Position = UDim2.new(0, 14, 0.5, 0)
panel.Size = UDim2.fromOffset(236, 360)
panel.BackgroundColor3 = PANEL
panel.BorderSizePixel = 0
panel.Parent = gui
local panelCorner = Instance.new("UICorner")
panelCorner.CornerRadius = UDim.new(0, 18)
panelCorner.Parent = panel
local stroke = Instance.new("UIStroke")
stroke.Color = BRASS
stroke.Transparency = 0.45
stroke.Thickness = 1.5
stroke.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(16, 14)
title.Size = UDim2.new(1, -32, 0, 26)
title.Font = Enum.Font.GothamBold
title.Text = "وصل"
title.TextColor3 = IVORY
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Right
title.Parent = panel

local who = Instance.new("TextLabel")
who.BackgroundTransparency = 1
who.Position = UDim2.fromOffset(16, 40)
who.Size = UDim2.new(1, -32, 0, 18)
who.Font = Enum.Font.GothamBold
who.Text = "@" .. player.Name
who.TextColor3 = BRASS
who.TextSize = 14
who.TextXAlignment = Enum.TextXAlignment.Right
who.Parent = panel

local hint = Instance.new("TextLabel")
hint.BackgroundTransparency = 1
hint.Position = UDim2.fromOffset(16, 62)
hint.Size = UDim2.new(1, -32, 0, 32)
hint.Font = Enum.Font.Gotham
hint.Text = "كود واحد لحسابك. تسمع اللي قريب منك بس."
hint.TextColor3 = MUTED
hint.TextSize = 13
hint.TextWrapped = true
hint.TextXAlignment = Enum.TextXAlignment.Right
hint.TextYAlignment = Enum.TextYAlignment.Top
hint.Parent = panel

local create = Instance.new("TextButton")
create.BackgroundColor3 = BRASS
create.Position = UDim2.fromOffset(16, 100)
create.Size = UDim2.new(1, -32, 0, 40)
create.Font = Enum.Font.GothamBold
create.Text = "كودي"
create.TextColor3 = INK
create.TextSize = 16
create.Parent = panel
local createCorner = Instance.new("UICorner")
createCorner.CornerRadius = UDim.new(0, 12)
createCorner.Parent = create

local box = Instance.new("TextBox")
box.BackgroundColor3 = INK
box.ClearTextOnFocus = false
box.Position = UDim2.fromOffset(16, 150)
box.Size = UDim2.new(1, -32, 0, 44)
box.Font = Enum.Font.GothamBold
box.PlaceholderText = "••••-••••"
box.PlaceholderColor3 = MUTED
box.Text = ""
box.TextColor3 = BRASS
box.TextSize = 22
box.Parent = panel
local boxCorner = Instance.new("UICorner")
boxCorner.CornerRadius = UDim.new(0, 12)
boxCorner.Parent = box

local mute = Instance.new("TextButton")
mute.BackgroundColor3 = INK
mute.Position = UDim2.fromOffset(16, 204)
mute.Size = UDim2.new(1, -32, 0, 40)
mute.Font = Enum.Font.GothamBold
mute.Text = "كتم المايك"
mute.TextColor3 = IVORY
mute.TextSize = 15
mute.Visible = false
mute.Parent = panel
local muteCorner = Instance.new("UICorner")
muteCorner.CornerRadius = UDim.new(0, 12)
muteCorner.Parent = mute

local status = Instance.new("TextLabel")
status.BackgroundTransparency = 1
status.Position = UDim2.fromOffset(16, 254)
status.Size = UDim2.new(1, -32, 0, 88)
status.Font = Enum.Font.Gotham
status.Text = "اضغط كودي، انسخه، والصقه في موقع وصل"
status.TextColor3 = MUTED
status.TextSize = 13
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Right
status.TextYAlignment = Enum.TextYAlignment.Top
status.Parent = panel

local function styleMute()
	local isMuted = player:GetAttribute("WaslMuted") == true
	if isMuted then
		mute.Text = "فتح المايك"
		mute.BackgroundColor3 = BRASS
		mute.TextColor3 = INK
	else
		mute.Text = "كتم المايك"
		mute.BackgroundColor3 = INK
		mute.TextColor3 = IVORY
	end
end

local function refreshStatus()
	mute.Visible = currentCode ~= ""
	styleMute()
	if currentCode == "" then
		status.Text = "اضغط كودي. الكود يثبت على حسابك طول ما أنت في اللعبة."
		status.TextColor3 = MUTED
	elseif player:GetAttribute("WaslLinked") == true and player:GetAttribute("WaslMuted") == true then
		status.Text = "مربوط. المايك مكتوم وما أحد يسمعك."
		status.TextColor3 = IVORY
	elseif player:GetAttribute("WaslLinked") == true then
		status.Text = "مربوط. تقدر تتكلم، واللي بعيد عنك ما يسمعك."
		status.TextColor3 = BRASS
	elseif remote == nil then
		status.Text = "حط سكربت السيرفر وفعّل Allow HTTP Requests"
		status.TextColor3 = MUTED
	else
		status.Text = "الصق الكود في الموقع. إذا ربطت، يطلع هنا إنك مربوط."
		status.TextColor3 = IVORY
	end
end

local function selectCode()
	if currentCode == "" then
		return
	end
	box.Text = currentCode
	if not box:IsFocused() then
		box:CaptureFocus()
	end
	box.SelectionStart = 1
	box.CursorPosition = #currentCode + 1
end

create.MouseButton1Click:Connect(function()
	if remote then
		remote:FireServer("want")
	else
		status.Text = "حط سكربت السيرفر وفعّل HTTP"
	end
end)

mute.MouseButton1Click:Connect(function()
	if currentCode == "" or not remote then
		return
	end
	local nextMuted = player:GetAttribute("WaslMuted") ~= true
	remote:FireServer("mute", nextMuted)
end)

box.Focused:Connect(function()
	if currentCode == "" then
		return
	end
	box.Text = currentCode
	box.SelectionStart = 1
	box.CursorPosition = #currentCode + 1
end)

box:GetPropertyChangedSignal("Text"):Connect(function()
	if currentCode ~= "" and box.Text ~= currentCode and not box:IsFocused() then
		box.Text = currentCode
	end
end)

if remote then
	remote.OnClientEvent:Connect(function(kind, payload)
		if kind == "code" and typeof(payload) == "string" then
			currentCode = payload
			box.Text = payload
			selectCode()
			refreshStatus()
		end
	end)
end

player:GetAttributeChangedSignal("WaslLinked"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslMuted"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslMic"):Connect(refreshStatus)

refreshStatus()
`;
}
var ROOM = "wasl";
var FULL_RANGE = 28;
var MAX_RANGE = 80;
function micError(err) {
	if (err instanceof DOMException) {
		if (err.name === "NotAllowedError" || err.name === "SecurityError") return "المتصفح منع المايك. اسمح له من علامة القفل جنب العنوان، ثم أعد المحاولة.";
		if (err.name === "NotFoundError") return "ما لقينا مايك على الجهاز.";
		if (err.name === "NotReadableError") return "المايك مستخدم من برنامج ثاني. سكّره وجرّب.";
	}
	if (err instanceof Error && err.message && !err.message.startsWith("Failed to")) return err.message;
	return "ما قدرنا نفتح المايك.";
}
function proximityGain(from, to) {
	const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
	if (distance <= FULL_RANGE) return 1;
	if (distance >= MAX_RANGE) return 0;
	return 1 - (distance - FULL_RANGE) / 52;
}
function hearLabel(player, gain) {
	if (!player.micOn) return "ما فتح المايك من الموقع";
	if (player.muted) return "كاتم من داخل اللعبة";
	if (gain <= 0) return "بعيد — ما تسمعه";
	if (gain < .99) return "يبعد وصوته واطي";
	return "قريب وتسمعه";
}
function RemoteVoice({ stream, gain }) {
	const nodeRef = (0, import_react.useRef)(null);
	const gainRef = (0, import_react.useRef)(gain);
	gainRef.current = gain;
	(0, import_react.useEffect)(() => {
		const audio = new AudioContext();
		audio.resume();
		const source = audio.createMediaStreamSource(stream);
		const node = audio.createGain();
		node.gain.value = gainRef.current;
		source.connect(node).connect(audio.destination);
		nodeRef.current = node;
		return () => {
			nodeRef.current = null;
			source.disconnect();
			audio.close();
		};
	}, [stream]);
	(0, import_react.useEffect)(() => {
		const node = nodeRef.current;
		if (!node) return;
		node.gain.setTargetAtTime(gain, node.context.currentTime, .08);
	}, [gain]);
	return null;
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "relative grid h-12 w-12 shrink-0 place-items-center",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wasl-ring absolute inset-0 rounded-full border border-brass" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wasl-ring wasl-ring-late absolute inset-2 rounded-full border border-brass" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3 w-3 rounded-full bg-brass" })
		]
	});
}
function BadgePreview() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "grid h-12 w-12 place-items-center rounded-full bg-brass text-brass-ink",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {
			className: "h-5 w-5",
			strokeWidth: 2.4
		})
	});
}
async function postWasl(body) {
	return fetch(browserApiPath("/api/wasl"), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body)
	});
}
function WaslApp() {
	const [draft, setDraft] = (0, import_react.useState)("");
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [error, setError] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [username, setUsername] = (0, import_react.useState)("");
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [selfPos, setSelfPos] = (0, import_react.useState)({
		x: 0,
		y: 0,
		z: 0
	});
	const [players, setPlayers] = (0, import_react.useState)([]);
	const [stream, setStream] = (0, import_react.useState)(null);
	const [remotes, setRemotes] = (0, import_react.useState)({});
	const [copied, setCopied] = (0, import_react.useState)(null);
	const [manual, setManual] = (0, import_react.useState)(null);
	const [base, setBase] = (0, import_react.useState)("");
	const streamRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		streamRef.current = stream;
	}, [stream]);
	(0, import_react.useEffect)(() => {
		setBase(browserPublicBase());
	}, []);
	(0, import_react.useEffect)(() => {
		if (!stream) return;
		for (const track of stream.getAudioTracks()) track.enabled = !muted;
	}, [stream, muted]);
	(0, import_react.useEffect)(() => {
		if (phase !== "live" || !code) return;
		let cancel = false;
		const beat = async () => {
			try {
				const res = await postWasl({
					op: "pulse",
					code,
					on: true
				});
				const data = await res.json();
				if (cancel) return;
				if (!res.ok || data.gone) {
					streamRef.current?.getTracks().forEach((track) => track.stop());
					setStream(null);
					setPhase("ended");
					return;
				}
				setUsername(data.username ?? "");
				setMuted(data.muted === true);
				setSelfPos({
					x: data.x ?? 0,
					y: data.y ?? 0,
					z: data.z ?? 0
				});
				setPlayers(data.players ?? []);
			} catch {}
		};
		beat();
		const id = window.setInterval(() => void beat(), 1e3);
		return () => {
			cancel = true;
			window.clearInterval(id);
		};
	}, [phase, code]);
	(0, import_react.useEffect)(() => {
		if (phase !== "live" || !stream || !code) return;
		let dead = false;
		const room = new P2PRoom({
			room: ROOM,
			selfId: code,
			name: code,
			localStream: stream,
			onRemoteStream: (id, remote) => {
				if (dead) return;
				setRemotes((prev) => prev[id] === remote ? prev : {
					...prev,
					[id]: remote
				});
			},
			onRemoteStreamEnd: (id) => {
				setRemotes((prev) => {
					if (!(id in prev)) return prev;
					const next = { ...prev };
					delete next[id];
					return next;
				});
			}
		});
		room.join();
		return () => {
			dead = true;
			room.close();
		};
	}, [
		phase,
		stream,
		code
	]);
	(0, import_react.useEffect)(() => {
		if (phase !== "live" || !code) return;
		const pause = () => {
			fetch(browserApiPath("/api/wasl"), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					op: "pause",
					code
				}),
				keepalive: true
			}).catch(() => {});
		};
		window.addEventListener("pagehide", pause);
		return () => window.removeEventListener("pagehide", pause);
	}, [phase, code]);
	async function enter(nextCode) {
		setError("");
		if (!isCode(nextCode)) {
			setError("الكود ٨ خانات، مثل K7M2-Q4NP، ويطلع من زر كودي في اللعبة.");
			return;
		}
		setPhase("joining");
		let mic = null;
		try {
			const peekRes = await postWasl({
				op: "peek",
				code: nextCode
			});
			const peeked = await peekRes.json();
			if (!peekRes.ok || peeked.gone) throw new Error("هذا الكود مو من لاعب موجود في اللعبة. اضغط كودي داخل روبلوكس أول.");
			mic = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				},
				video: false
			});
			const res = await postWasl({
				op: "pulse",
				code: nextCode,
				on: true
			});
			const data = await res.json();
			if (!res.ok || data.gone) throw new Error("الربط انقطع. ارجع للعبة وخذ الكود من جديد.");
			setStream(mic);
			setCode(nextCode);
			setUsername(data.username || peeked.username || "");
			setMuted(data.muted === true);
			setSelfPos({
				x: data.x ?? 0,
				y: data.y ?? 0,
				z: data.z ?? 0
			});
			setPlayers(data.players ?? []);
			setRemotes({});
			setPhase("live");
		} catch (err) {
			mic?.getTracks().forEach((track) => track.stop());
			setPhase("idle");
			setError(micError(err));
		}
	}
	function stopPage() {
		stream?.getTracks().forEach((track) => track.stop());
		const active = code;
		setStream(null);
		setRemotes({});
		setPlayers([]);
		setPhase("idle");
		if (active) postWasl({
			op: "pause",
			code: active
		}).catch(() => {});
	}
	async function copyText(key, title, text) {
		try {
			await navigator.clipboard.writeText(text);
			setManual(null);
			setCopied(key);
		} catch {
			setManual({
				title,
				text
			});
			setCopied(null);
		}
		window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800);
	}
	const origin = base || "https://example.grok.me";
	const httpOnly = base.startsWith("http://");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-dvh max-w-5xl px-4 py-6 pb-24 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-3xl leading-none text-fg",
						children: "وَصْل"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "المايك من هنا، والكلام من داخل روبلوكس"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 grid items-start gap-6 lg:grid-cols-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "min-w-0 lg:col-span-3",
					children: phase === "ended" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-3xl border border-line bg-surface p-5 sm:p-7",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-brass",
								children: "انقطع"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 font-display text-3xl text-fg",
								children: "طلع من اللعبة"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-base leading-relaxed text-muted",
								children: "الكود انحذف والمايك توقف. إذا رجع يبغى يتكلم، يضغط كودي من جديد ويلصق الكود هنا."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mt-6 h-12 rounded-2xl bg-brass px-5 text-sm font-semibold text-brass-ink",
								onClick: () => {
									setDraft("");
									setCode("");
									setUsername("");
									setPhase("idle");
								},
								children: "اربط كود جديد"
							})
						]
					}) : phase !== "live" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "rounded-3xl border border-line bg-surface p-5 sm:p-7",
						onSubmit: (event) => {
							event.preventDefault();
							enter(draft);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-brass",
								children: "ربط اللاعب"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 text-balance font-display text-3xl leading-tight text-fg sm:text-4xl",
								children: "الصق كود اللاعب عشان ينفتح مايكه في روبلوكس"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted",
								children: "الكود واحد ومربوط بحسابه. بعد الربط القائمة في اللعبة تقول مربوط، وتقدر تكتم أو تفتح من هناك. اللي بعيد ما ينسمع."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-6 block text-sm text-muted",
								htmlFor: "wasl-code",
								children: "كود اللاعب"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "wasl-code",
								value: draft,
								onChange: (event) => setDraft(formatCodeInput(event.target.value)),
								dir: "ltr",
								inputMode: "text",
								autoCapitalize: "characters",
								autoComplete: "off",
								spellCheck: false,
								placeholder: "K7M2-Q4NP",
								maxLength: 9,
								className: "mt-2 h-14 w-full rounded-2xl border border-line bg-bg px-4 text-center font-display text-2xl tracking-widest text-fg placeholder:text-line"
							}),
							error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-brass",
								role: "alert",
								children: error
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: phase === "joining" || !isCode(draft),
								className: "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brass px-4 text-base font-semibold text-brass-ink disabled:opacity-40",
								children: [phase === "joining" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-5 w-5" }), phase === "joining" ? "نفتح المايك…" : "اربط وافتح المايك"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "mt-6 grid gap-3 sm:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }),
										text: "كود واحد لحسابه"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-4 w-4" }),
										text: "الكتم من اللعبة"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-4 w-4" }),
										text: "البعيد ما ينسمع"
									})
								]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-3xl border border-line bg-surface p-5 sm:p-7",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm font-medium text-brass",
											children: "مربوط"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 truncate font-display text-3xl text-fg",
											dir: "ltr",
											children: ["@", username || "player"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											dir: "ltr",
											className: "mt-1 font-display text-xl tracking-widest text-muted",
											onClick: () => void copyText("code", "الكود", code),
											children: code
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-muted",
											children: copied === "code" ? "تم نسخ الكود" : "اضغط الكود عشان ينسخ"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgePreview, {})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 rounded-2xl bg-bg p-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-semibold text-fg",
										children: muted ? "المايك مكتوم من اللعبة" : "المايك شغّال في اللعبة"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs leading-relaxed text-muted",
										children: "الكتم والفتح من زر القائمة يسار، مو من هنا."
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelMeter, {
										stream,
										active: !muted
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-sm font-semibold text-fg",
									children: "اللاعبين"
								}), players.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-relaxed text-muted",
									children: "ما فيه لاعب ثاني رابط المايك. إذا قربوا من بعض داخل اللعبة يسمعون بعض، وإذا بعدوا ينقطع الصوت."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 grid gap-2",
									children: players.map((player) => {
										const gain = player.muted || !player.micOn ? 0 : proximityGain(selfPos, player);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "truncate text-sm font-semibold text-fg",
													dir: "ltr",
													children: ["@", player.username || player.code]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-muted",
													children: hearLabel(player, gain)
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelMeter, {
												stream: remotes[player.code] ?? null,
												active: gain > 0 && !player.muted && player.micOn
											})]
										}, player.code);
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Headphones, { className: "mt-0.5 h-4 w-4 shrink-0" }), "خلّ الصفحة مفتوحة بالخلفية وحط سماعة. إذا طلعت من اللعبة ينحذف الكود ويقفل المايك لحاله."]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mt-4 h-12 w-full rounded-2xl border border-line text-sm font-medium text-fg",
								onClick: stopPage,
								children: "اقفل المايك هنا"
							}),
							Object.entries(remotes).map(([id, remote]) => {
								const player = players.find((item) => item.code === id);
								const gain = !player || player.muted || !player.micOn ? 0 : proximityGain(selfPos, player);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RemoteVoice, {
									stream: remote,
									gain
								}, id);
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: "min-w-0 lg:col-span-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-3xl border border-line bg-surface p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-2xl text-fg",
								children: "سكربت اللعبة"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: "حق لعبتك في استوديو روبلوكس. كود واحد لكل لاعب، وزر كتم، وعلامة مايك فوق الراس إذا المايك مفتوح."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
								className: "mt-4 grid gap-3 text-sm leading-relaxed text-fg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
										n: "١",
										text: "انسخ سكربت السيرفر وحطه في ServerScriptService."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
										n: "٢",
										text: "انسخ سكربت اللاعب وحطه في StarterPlayerScripts."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
										n: "٣",
										text: "من Game Settings فعّل Allow HTTP Requests."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
										n: "٤",
										text: "اضغط كودي، انسخ الكود، والصقه هنا. القائمة تقول مربوط، ومن نفس القائمة تكتم أو تفتح."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyButton, {
									copied: copied === "server",
									label: "نسخ سكربت السيرفر",
									onClick: () => void copyText("server", "سكربت السيرفر", serverScript(origin))
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyButton, {
									copied: copied === "client",
									label: "نسخ سكربت اللاعب",
									onClick: () => void copyText("client", "سكربت اللاعب", clientScript())
								})]
							}),
							httpOnly ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-xs leading-relaxed text-muted",
								children: "روبلوكس يتصل فقط برابط https. بعد النشر انسخ سكربت السيرفر من الموقع المنشور."
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex items-center gap-3 rounded-2xl bg-bg p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgePreview, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold text-fg",
									children: "علامة فوق الرأس"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs leading-relaxed text-muted",
									children: "تظهر إذا اللاعب مربوط والمايك مفتوح، وتختفي إذا كتم أو طلع."
								})] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 rounded-2xl border border-line bg-bg p-3",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted",
									children: "معاينة القائمة يسار"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 w-44 rounded-2xl bg-surface p-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-display text-lg text-fg",
											children: "وصل"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-brass",
											dir: "ltr",
											children: "@player"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2 rounded-xl bg-brass py-2 text-center text-xs font-semibold text-brass-ink",
											children: "كودي"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											dir: "ltr",
											className: "mt-2 rounded-xl bg-bg py-2 text-center font-display tracking-widest text-brass",
											children: "K7M2-Q4NP"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2 rounded-xl bg-raised py-2 text-center text-xs text-fg",
											children: "كتم المايك"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
								className: "mt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
										className: "text-sm text-muted",
										children: "عرض السكربتات"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
										dir: "ltr",
										className: "mt-3 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted",
										children: serverScript(origin)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
										dir: "ltr",
										className: "mt-2 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted",
										children: clientScript()
									})
								]
							})
						]
					})
				})]
			}),
			manual ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 rounded-3xl border border-line bg-surface p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm font-semibold text-fg",
					children: [
						"انسخ ",
						manual.title,
						" يدويًا"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					readOnly: true,
					dir: "ltr",
					value: manual.text,
					className: "mt-3 h-48 w-full rounded-2xl bg-bg p-3 text-left text-xs text-fg",
					onFocus: (event) => event.currentTarget.select()
				})]
			}) : null
		]
	});
}
function Fact({ icon, text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex items-center gap-2 rounded-2xl bg-bg px-3 py-3 text-xs text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-brass",
			children: icon
		}), text]
	});
}
function Step({ n, text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised font-display text-brass",
			children: n
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "pt-0.5",
			children: text
		})]
	});
}
function CopyButton({ label, copied, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "flex h-12 items-center justify-center gap-2 rounded-2xl bg-brass text-sm font-semibold text-brass-ink",
		children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" }), copied ? "تم النسخ" : label]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaslApp, {});
}
//#endregion
export { Home as component };
