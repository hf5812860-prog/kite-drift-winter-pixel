import{a as e,i as t,n,o as r,r as i,t as a}from"./index-ml7TbOGy.js";var o=i(`check`,[[`path`,{d:`M20 6 9 17l-5-5`,key:`1gmf2c`}]]),s=i(`copy`,[[`rect`,{width:`14`,height:`14`,x:`8`,y:`8`,rx:`2`,ry:`2`,key:`17jyea`}],[`path`,{d:`M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`,key:`zix9uf`}]]),c=i(`headphones`,[[`path`,{d:`M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3`,key:`1xhozi`}]]),l=i(`key-round`,[[`path`,{d:`M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z`,key:`1s6t7t`}],[`circle`,{cx:`16.5`,cy:`7.5`,r:`.5`,fill:`currentColor`,key:`w0ekpg`}]]),u=i(`loader-circle`,[[`path`,{d:`M21 12a9 9 0 1 1-6.219-8.56`,key:`13zald`}]]),d=i(`mic`,[[`path`,{d:`M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z`,key:`131961`}],[`path`,{d:`M19 10v2a7 7 0 0 1-14 0v-2`,key:`1vc78b`}],[`line`,{x1:`12`,x2:`12`,y1:`19`,y2:`22`,key:`x3vr5v`}]]),f=i(`radio`,[[`path`,{d:`M4.9 19.1C1 15.2 1 8.8 4.9 4.9`,key:`1vaf9d`}],[`path`,{d:`M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5`,key:`u1ii0m`}],[`circle`,{cx:`12`,cy:`12`,r:`2`,key:`1c9p78`}],[`path`,{d:`M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5`,key:`1j5fej`}],[`path`,{d:`M19.1 4.9C23 8.8 23 15.1 19.1 19`,key:`10b0cb`}]]),p=r(e(),1),m=t(),h=12;function g({stream:e,active:t}){let n=(0,p.useRef)(null);return(0,p.useEffect)(()=>{let r=n.current,i=r?[...r.querySelectorAll(`[data-bar]`)]:[],a=()=>{for(let e of i)e.style.transform=`scaleY(0.16)`};if(!r||!e||!t){a();return}let o=new AudioContext;o.resume();let s=o.createMediaStreamSource(e),c=o.createAnalyser();c.fftSize=64,s.connect(c);let l=new Uint8Array(c.frequencyBinCount),u=0,d=0,f=e=>{u=requestAnimationFrame(f),!(e-d<70)&&(d=e,c.getByteFrequencyData(l),i.forEach((e,t)=>{let n=Math.floor(t/i.length*l.length),r=Math.max(n+1,Math.floor((t+1)/i.length*l.length)),a=0;for(let e=n;e<r;e++)a+=l[e]??0;let o=a/(r-n)/255;e.style.transform=`scaleY(${(.16+o*.84).toFixed(3)})`}))};return u=requestAnimationFrame(f),()=>{cancelAnimationFrame(u),s.disconnect(),o.close(),a()}},[e,t]),(0,m.jsx)(`div`,{ref:n,className:`flex h-8 items-end gap-1`,"aria-hidden":`true`,children:Array.from({length:h},(e,t)=>(0,m.jsx)(`span`,{"data-bar":``,className:`h-full w-1 origin-bottom rounded-full bg-brass`,style:{transform:`scaleY(0.16)`}},t))})}var _=400,v=2e3,y=2e3,b=1e4,x=3,S=[250,750];function C(){return[{urls:[`stun:stun.l.google.com:19302`,`stun:stun.cloudflare.com:3478`]}]}var w=class{opts;peers=new Map;signalQueues=new Map;cursor=0;pollTimer=null;pingTimer=null;closed=!1;everPolled=!1;lastPeersFingerprint=``;constructor(e){this.opts=e}async join(){try{await this.pollOnce()}catch{}this.closed||(this.schedulePoll(this.anyPairConnecting()?_:v),this.pingTimer=setInterval(()=>{this.pingAll(),this.watchdog()},y))}close(){this.closed=!0,this.pollTimer&&clearTimeout(this.pollTimer),this.pingTimer&&clearInterval(this.pingTimer);for(let[e,t]of this.peers)t.pc.close(),this.opts.onRemoteStreamEnd?.(e);this.peers.clear(),fetch(a(`/api/rtc`),{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({op:`leave`,room:this.opts.room,peer:this.opts.selfId}),keepalive:!0}).catch(()=>{})}broadcast(e){let t=JSON.stringify({t:`d`,d:e});for(let e of this.peers.values())e.state?.readyState===`open`&&e.state.send(t)}send(e,t){let n=JSON.stringify({t:`d`,d:e}),r=t?[this.peers.get(t)]:[...this.peers.values()];for(let e of r)e?.reliable?.readyState===`open`&&e.reliable.send(n)}peerList(){return[...this.peers.values()].map(e=>({...e.info}))}schedulePoll(e){this.closed||(this.pollTimer&&clearTimeout(this.pollTimer),this.pollTimer=setTimeout(()=>void this.poll(),e))}anyPairConnecting(){for(let e of this.peers.values())if(!e.terminal&&e.info.connectionState!==`connected`)return!0;return!1}async pollOnce(){let e=new URLSearchParams({room:this.opts.room,peer:this.opts.selfId,name:this.opts.name??``,since:String(this.cursor)}),t=await fetch(`${a(`/api/rtc`)}?${e}`);if(this.closed)return;if(!t.ok)throw Error(`signaling poll failed: ${t.status}`);let n=await t.json();if(this.closed)return;this.everPolled||(this.everPolled=!0,this.opts.onConnected?.()),this.reconcileRoster(n.peers);let r=new Set(n.peers.map(e=>e.id));for(let e of n.signals)if(this.cursor=Math.max(this.cursor,e.id),await this.onSignal(e.from,e.kind,e.payload,r),this.closed)return}async poll(){if(!this.closed){try{await this.pollOnce()}catch{}this.schedulePoll(this.anyPairConnecting()?_:v)}}reconcileRoster(e){let t=new Set(e.map(e=>e.id));for(let t of e){if(t.id===this.opts.selfId)continue;let e=this.peers.get(t.id);e?e.info.name=t.name:this.connectTo(t.id,t.name,this.opts.selfId>t.id)}for(let[e,n]of this.peers)t.has(e)||(n.pc.close(),this.peers.delete(e),this.opts.onRemoteStreamEnd?.(e));this.emitPeers()}connectTo(e,t,n){if(this.closed)return null;let r=new RTCPeerConnection({iceServers:this.opts.iceServers??C()}),i={pc:r,makingOffer:!1,ignoreOffer:!1,pendingCandidates:[],lastProgressAt:Date.now(),recoveryAttempts:0,info:{id:e,name:t,connectionState:r.connectionState,candidateType:null,rttMs:null}};this.peers.set(e,i);let a=this.opts.localStream;if(a)for(let e of a.getAudioTracks())r.addTrack(e,a);return r.ontrack=t=>{let n=t.streams[0]??new MediaStream([t.track]);this.opts.onRemoteStream?.(e,n)},r.onicecandidate=t=>{t.candidate&&this.sendSignal(e,`ice`,t.candidate.toJSON())},r.onconnectionstatechange=()=>{i.info.connectionState=r.connectionState,(r.connectionState===`connecting`||r.connectionState===`connected`)&&(i.lastProgressAt=Date.now()),r.connectionState===`connected`&&(i.recoveryAttempts=0,i.terminal=!1,this.readCandidateType(i)),this.emitPeers(),r.connectionState===`failed`&&r.restartIce(),(r.connectionState===`failed`||r.connectionState===`disconnected`)&&this.schedulePoll(_)},r.onnegotiationneeded=async()=>{try{i.makingOffer=!0,await r.setLocalDescription(),await this.sendSignal(e,`offer`,r.localDescription.toJSON())}catch{}finally{i.makingOffer=!1}},r.ondatachannel=e=>this.attachChannel(i,e.channel),n&&(this.attachChannel(i,r.createDataChannel(`state`,{ordered:!1,maxRetransmits:0})),this.attachChannel(i,r.createDataChannel(`reliable`,{ordered:!0}))),i}attachChannel(e,t){t.label===`state`?e.state=t:e.reliable=t,t.onopen=()=>{e.lastProgressAt=Date.now()},t.onmessage=n=>{let r;try{r=JSON.parse(n.data)}catch{return}r.t===`ping`?e.state?.readyState===`open`&&e.state.send(JSON.stringify({t:`pong`})):r.t===`pong`?e.pingSentAt&&(e.info.rttMs=Math.round(performance.now()-e.pingSentAt),e.pingSentAt=void 0,this.emitPeers()):this.opts.onMessage?.(e.info.id,r.d,t.label===`state`?`state`:`reliable`)}}async flushPendingCandidates(e){for(;e.pendingCandidates.length>0;){let t=e.pendingCandidates.shift();try{await e.pc.addIceCandidate(t)}catch(t){e.ignoreOffer||console.warn(`[p2p] addIceCandidate failed:`,t)}if(this.closed)return}}async onSignal(e,t,n,r){if(this.closed)return;let i=this.peers.get(e);if(!i){if(!r.has(e))return;let t=this.connectTo(e,``,!1);if(!t)return;i=t}let a=this.opts.selfId<e;try{if(t===`offer`||t===`answer`){let r=n,o=t===`offer`&&(i.makingOffer||i.pc.signalingState!==`stable`);if(i.ignoreOffer=!a&&o,i.ignoreOffer)return;try{await i.pc.setRemoteDescription(r)}catch(n){if(t!==`offer`||i.recreatedForOffer)throw n;let a=i.recoveryAttempts,o=i.info.name;i.pc.close(),this.peers.delete(e),this.opts.onRemoteStreamEnd?.(e);let s=this.connectTo(e,o,!1);if(!s)return;s.recoveryAttempts=a,s.recreatedForOffer=!0,i=s,await i.pc.setRemoteDescription(r)}if(this.closed||(await this.flushPendingCandidates(i),this.closed))return;if(t===`offer`){if(await i.pc.setLocalDescription(),this.closed)return;await this.sendSignal(e,`answer`,i.pc.localDescription.toJSON())}}else if(t===`ice`){let e=n;if(!i.pc.remoteDescription){i.pendingCandidates.push(e);return}try{await i.pc.addIceCandidate(e)}catch(e){i.ignoreOffer||console.warn(`[p2p] addIceCandidate failed:`,e)}}}catch{}}sendSignal(e,t,n){let r=(this.signalQueues.get(e)??Promise.resolve()).then(()=>this.postSignal(e,t,n));return this.signalQueues.set(e,r.catch(()=>{})),r}async postSignal(e,t,n){for(let r=0;;r++){if(this.closed)return;try{let r=await fetch(a(`/api/rtc`),{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({op:`signal`,room:this.opts.room,from:this.opts.selfId,to:e,kind:t,payload:n})});if(r.ok)return;throw Error(`signal POST failed: ${r.status}`)}catch(n){if(r>=S.length){console.warn(`[p2p] signal ${t} to ${e} failed after retries`,n);return}await new Promise(e=>setTimeout(e,S[r]))}}}pingAll(){let e=JSON.stringify({t:`ping`});for(let t of this.peers.values()){if(t.state?.readyState!==`open`)continue;let n=t.pingSentAt!==void 0&&performance.now()-t.pingSentAt>2*y;(t.pingSentAt===void 0||n)&&(t.pingSentAt=performance.now(),t.state.send(e))}}watchdog(){if(this.closed)return;let e=Date.now();for(let[t,n]of this.peers){let r=n.pc.connectionState;if(r!==n.info.connectionState&&(n.info.connectionState=r,(r===`connecting`||r===`connected`)&&(n.lastProgressAt=e),this.emitPeers()),!(n.terminal||r===`connected`)&&!(e-n.lastProgressAt<=b)){if(n.recoveryAttempts>=x)n.terminal=!0,this.emitPeers();else if(n.recoveryAttempts+=1,n.lastProgressAt=e,this.opts.selfId>t){let{name:e}=n.info,r=n.recoveryAttempts;n.pc.close(),this.peers.delete(t),this.opts.onRemoteStreamEnd?.(t);let i=this.connectTo(t,e,!0);i&&(i.recoveryAttempts=r),this.schedulePoll(_)}}}}async readCandidateType(e){try{let t=await e.pc.getStats(),n;t.forEach(e=>{e.type===`candidate-pair`&&e.nominated&&(n=e)});let r=n?.localCandidateId;if(r){let n=t.get(r);e.info.candidateType=n?.candidateType??null,this.emitPeers()}}catch{}}emitPeers(){let e=this.peerList(),t=JSON.stringify(e.map(e=>[e.id,e.name,e.connectionState,e.candidateType,e.rttMs]));t!==this.lastPeersFingerprint&&(this.lastPeersFingerprint=t,this.opts.onPeersChanged?.(e))}};function T(e){let t=e.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g,``).slice(0,8);return t.length<=4?t:`${t.slice(0,4)}-${t.slice(4)}`}function E(e){return/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(e)}function D(e){return`-- وصل | سكربت السيرفر
-- حطه في ServerScriptService
-- لازم تفعّل Game Settings > Security > Allow HTTP Requests
-- كل لاعب له كود واحد مربوط بحسابه. إذا طلع من اللعبة ينحذف الكود.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API = "${e.replace(/["\\\n\r]/g,``)}/api/wasl"
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
`}function O(){return`-- وصل | سكربت اللاعب
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
`}var k=`wasl`,A=28,j=80;function M(e){if(e instanceof DOMException){if(e.name===`NotAllowedError`||e.name===`SecurityError`)return`المتصفح منع المايك. اسمح له من علامة القفل جنب العنوان، ثم أعد المحاولة.`;if(e.name===`NotFoundError`)return`ما لقينا مايك على الجهاز.`;if(e.name===`NotReadableError`)return`المايك مستخدم من برنامج ثاني. سكّره وجرّب.`}return e instanceof Error&&e.message&&!e.message.startsWith(`Failed to`)?e.message:`ما قدرنا نفتح المايك.`}function N(e,t){let n=Math.hypot(e.x-t.x,e.y-t.y,e.z-t.z);return n<=A?1:n>=j?0:1-(n-A)/52}function P(e,t){return e.micOn?e.muted?`كاتم من داخل اللعبة`:t<=0?`بعيد — ما تسمعه`:t<.99?`يبعد وصوته واطي`:`قريب وتسمعه`:`ما فتح المايك من الموقع`}function ee({stream:e,gain:t}){let n=(0,p.useRef)(null),r=(0,p.useRef)(t);return r.current=t,(0,p.useEffect)(()=>{let t=new AudioContext;t.resume();let i=t.createMediaStreamSource(e),a=t.createGain();return a.gain.value=r.current,i.connect(a).connect(t.destination),n.current=a,()=>{n.current=null,i.disconnect(),t.close()}},[e]),(0,p.useEffect)(()=>{let e=n.current;e&&e.gain.setTargetAtTime(t,e.context.currentTime,.08)},[t]),null}function F(){return(0,m.jsxs)(`span`,{className:`relative grid h-12 w-12 shrink-0 place-items-center`,"aria-hidden":`true`,children:[(0,m.jsx)(`span`,{className:`wasl-ring absolute inset-0 rounded-full border border-brass`}),(0,m.jsx)(`span`,{className:`wasl-ring wasl-ring-late absolute inset-2 rounded-full border border-brass`}),(0,m.jsx)(`span`,{className:`h-3 w-3 rounded-full bg-brass`})]})}function I(){return(0,m.jsx)(`span`,{className:`grid h-12 w-12 place-items-center rounded-full bg-brass text-brass-ink`,"aria-hidden":`true`,children:(0,m.jsx)(d,{className:`h-5 w-5`,strokeWidth:2.4})})}async function L(e){return fetch(a(`/api/wasl`),{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify(e)})}function R(){let[e,t]=(0,p.useState)(``),[r,i]=(0,p.useState)(`idle`),[o,s]=(0,p.useState)(``),[h,_]=(0,p.useState)(``),[v,y]=(0,p.useState)(``),[b,x]=(0,p.useState)(!1),[S,C]=(0,p.useState)({x:0,y:0,z:0}),[A,j]=(0,p.useState)([]),[R,H]=(0,p.useState)(null),[U,W]=(0,p.useState)({}),[G,K]=(0,p.useState)(null),[q,J]=(0,p.useState)(null),[Y,X]=(0,p.useState)(``),Z=(0,p.useRef)(null);(0,p.useEffect)(()=>{Z.current=R},[R]),(0,p.useEffect)(()=>{X(n())},[]),(0,p.useEffect)(()=>{if(R)for(let e of R.getAudioTracks())e.enabled=!b},[R,b]),(0,p.useEffect)(()=>{if(r!==`live`||!h)return;let e=!1,t=async()=>{try{let t=await L({op:`pulse`,code:h,on:!0}),n=await t.json();if(e)return;if(!t.ok||n.gone){Z.current?.getTracks().forEach(e=>e.stop()),H(null),i(`ended`);return}y(n.username??``),x(n.muted===!0),C({x:n.x??0,y:n.y??0,z:n.z??0}),j(n.players??[])}catch{}};t();let n=window.setInterval(()=>void t(),1e3);return()=>{e=!0,window.clearInterval(n)}},[r,h]),(0,p.useEffect)(()=>{if(r!==`live`||!R||!h)return;let e=!1,t=new w({room:k,selfId:h,name:h,localStream:R,onRemoteStream:(t,n)=>{e||W(e=>e[t]===n?e:{...e,[t]:n})},onRemoteStreamEnd:e=>{W(t=>{if(!(e in t))return t;let n={...t};return delete n[e],n})}});return t.join(),()=>{e=!0,t.close()}},[r,R,h]),(0,p.useEffect)(()=>{if(r!==`live`||!h)return;let e=()=>{fetch(a(`/api/wasl`),{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify({op:`pause`,code:h}),keepalive:!0}).catch(()=>{})};return window.addEventListener(`pagehide`,e),()=>window.removeEventListener(`pagehide`,e)},[r,h]);async function te(e){if(s(``),!E(e)){s(`الكود ٨ خانات، مثل K7M2-Q4NP، ويطلع من زر كودي في اللعبة.`);return}i(`joining`);let t=null;try{let n=await L({op:`peek`,code:e}),r=await n.json();if(!n.ok||r.gone)throw Error(`هذا الكود مو من لاعب موجود في اللعبة. اضغط كودي داخل روبلوكس أول.`);t=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0},video:!1});let a=await L({op:`pulse`,code:e,on:!0}),o=await a.json();if(!a.ok||o.gone)throw Error(`الربط انقطع. ارجع للعبة وخذ الكود من جديد.`);H(t),_(e),y(o.username||r.username||``),x(o.muted===!0),C({x:o.x??0,y:o.y??0,z:o.z??0}),j(o.players??[]),W({}),i(`live`)}catch(e){t?.getTracks().forEach(e=>e.stop()),i(`idle`),s(M(e))}}function ne(){R?.getTracks().forEach(e=>e.stop());let e=h;H(null),W({}),j([]),i(`idle`),e&&L({op:`pause`,code:e}).catch(()=>{})}async function Q(e,t,n){try{await navigator.clipboard.writeText(n),J(null),K(e)}catch{J({title:t,text:n}),K(null)}window.setTimeout(()=>K(t=>t===e?null:t),1800)}let $=Y||`https://example.grok.me`,re=Y.startsWith(`http://`);return(0,m.jsxs)(`main`,{className:`mx-auto min-h-dvh max-w-5xl px-4 py-6 pb-24 sm:px-6`,children:[(0,m.jsxs)(`header`,{className:`flex items-center gap-4`,children:[(0,m.jsx)(F,{}),(0,m.jsxs)(`div`,{className:`min-w-0`,children:[(0,m.jsx)(`p`,{className:`font-display text-3xl leading-none text-fg`,children:`وَصْل`}),(0,m.jsx)(`p`,{className:`mt-1 text-sm text-muted`,children:`المايك من هنا، والكلام من داخل روبلوكس`})]})]}),(0,m.jsxs)(`div`,{className:`mt-8 grid items-start gap-6 lg:grid-cols-5`,children:[(0,m.jsx)(`section`,{className:`min-w-0 lg:col-span-3`,children:r===`ended`?(0,m.jsxs)(`div`,{className:`rounded-3xl border border-line bg-surface p-5 sm:p-7`,children:[(0,m.jsx)(`p`,{className:`text-sm font-medium text-brass`,children:`انقطع`}),(0,m.jsx)(`h1`,{className:`mt-2 font-display text-3xl text-fg`,children:`طلع من اللعبة`}),(0,m.jsx)(`p`,{className:`mt-3 text-base leading-relaxed text-muted`,children:`الكود انحذف والمايك توقف. إذا رجع يبغى يتكلم، يضغط كودي من جديد ويلصق الكود هنا.`}),(0,m.jsx)(`button`,{type:`button`,className:`mt-6 h-12 rounded-2xl bg-brass px-5 text-sm font-semibold text-brass-ink`,onClick:()=>{t(``),_(``),y(``),i(`idle`)},children:`اربط كود جديد`})]}):r===`live`?(0,m.jsxs)(`div`,{className:`rounded-3xl border border-line bg-surface p-5 sm:p-7`,children:[(0,m.jsxs)(`div`,{className:`flex items-start justify-between gap-4`,children:[(0,m.jsxs)(`div`,{className:`min-w-0`,children:[(0,m.jsx)(`p`,{className:`text-sm font-medium text-brass`,children:`مربوط`}),(0,m.jsxs)(`p`,{className:`mt-1 truncate font-display text-3xl text-fg`,dir:`ltr`,children:[`@`,v||`player`]}),(0,m.jsx)(`button`,{type:`button`,dir:`ltr`,className:`mt-1 font-display text-xl tracking-widest text-muted`,onClick:()=>void Q(`code`,`الكود`,h),children:h}),(0,m.jsx)(`p`,{className:`mt-1 text-xs text-muted`,children:G===`code`?`تم نسخ الكود`:`اضغط الكود عشان ينسخ`})]}),(0,m.jsx)(I,{})]}),(0,m.jsx)(`div`,{className:`mt-5 rounded-2xl bg-bg p-4`,children:(0,m.jsxs)(`div`,{className:`flex items-center justify-between gap-3`,children:[(0,m.jsxs)(`div`,{children:[(0,m.jsx)(`p`,{className:`text-sm font-semibold text-fg`,children:b?`المايك مكتوم من اللعبة`:`المايك شغّال في اللعبة`}),(0,m.jsx)(`p`,{className:`text-xs leading-relaxed text-muted`,children:`الكتم والفتح من زر القائمة يسار، مو من هنا.`})]}),(0,m.jsx)(g,{stream:R,active:!b})]})}),(0,m.jsxs)(`div`,{className:`mt-6`,children:[(0,m.jsx)(`h2`,{className:`text-sm font-semibold text-fg`,children:`اللاعبين`}),A.length===0?(0,m.jsx)(`p`,{className:`mt-3 text-sm leading-relaxed text-muted`,children:`ما فيه لاعب ثاني رابط المايك. إذا قربوا من بعض داخل اللعبة يسمعون بعض، وإذا بعدوا ينقطع الصوت.`}):(0,m.jsx)(`ul`,{className:`mt-3 grid gap-2`,children:A.map(e=>{let t=e.muted||!e.micOn?0:N(S,e);return(0,m.jsxs)(`li`,{className:`flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-3`,children:[(0,m.jsxs)(`div`,{className:`min-w-0`,children:[(0,m.jsxs)(`p`,{className:`truncate text-sm font-semibold text-fg`,dir:`ltr`,children:[`@`,e.username||e.code]}),(0,m.jsx)(`p`,{className:`text-xs text-muted`,children:P(e,t)})]}),(0,m.jsx)(g,{stream:U[e.code]??null,active:t>0&&!e.muted&&e.micOn})]},e.code)})})]}),(0,m.jsxs)(`p`,{className:`mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted`,children:[(0,m.jsx)(c,{className:`mt-0.5 h-4 w-4 shrink-0`}),`خلّ الصفحة مفتوحة بالخلفية وحط سماعة. إذا طلعت من اللعبة ينحذف الكود ويقفل المايك لحاله.`]}),(0,m.jsx)(`button`,{type:`button`,className:`mt-4 h-12 w-full rounded-2xl border border-line text-sm font-medium text-fg`,onClick:ne,children:`اقفل المايك هنا`}),Object.entries(U).map(([e,t])=>{let n=A.find(t=>t.code===e),r=!n||n.muted||!n.micOn?0:N(S,n);return(0,m.jsx)(ee,{stream:t,gain:r},e)})]}):(0,m.jsxs)(`form`,{className:`rounded-3xl border border-line bg-surface p-5 sm:p-7`,onSubmit:t=>{t.preventDefault(),te(e)},children:[(0,m.jsx)(`p`,{className:`text-sm font-medium text-brass`,children:`ربط اللاعب`}),(0,m.jsx)(`h1`,{className:`mt-2 text-balance font-display text-3xl leading-tight text-fg sm:text-4xl`,children:`الصق كود اللاعب عشان ينفتح مايكه في روبلوكس`}),(0,m.jsx)(`p`,{className:`mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted`,children:`الكود واحد ومربوط بحسابه. بعد الربط القائمة في اللعبة تقول مربوط، وتقدر تكتم أو تفتح من هناك. اللي بعيد ما ينسمع.`}),(0,m.jsx)(`label`,{className:`mt-6 block text-sm text-muted`,htmlFor:`wasl-code`,children:`كود اللاعب`}),(0,m.jsx)(`input`,{id:`wasl-code`,value:e,onChange:e=>t(T(e.target.value)),dir:`ltr`,inputMode:`text`,autoCapitalize:`characters`,autoComplete:`off`,spellCheck:!1,placeholder:`K7M2-Q4NP`,maxLength:9,className:`mt-2 h-14 w-full rounded-2xl border border-line bg-bg px-4 text-center font-display text-2xl tracking-widest text-fg placeholder:text-line`}),o?(0,m.jsx)(`p`,{className:`mt-3 text-sm leading-relaxed text-brass`,role:`alert`,children:o}):null,(0,m.jsxs)(`button`,{type:`submit`,disabled:r===`joining`||!E(e),className:`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brass px-4 text-base font-semibold text-brass-ink disabled:opacity-40`,children:[r===`joining`?(0,m.jsx)(u,{className:`h-5 w-5 animate-spin`}):(0,m.jsx)(d,{className:`h-5 w-5`}),r===`joining`?`نفتح المايك…`:`اربط وافتح المايك`]}),(0,m.jsxs)(`ul`,{className:`mt-6 grid gap-3 sm:grid-cols-3`,children:[(0,m.jsx)(z,{icon:(0,m.jsx)(l,{className:`h-4 w-4`}),text:`كود واحد لحسابه`}),(0,m.jsx)(z,{icon:(0,m.jsx)(d,{className:`h-4 w-4`}),text:`الكتم من اللعبة`}),(0,m.jsx)(z,{icon:(0,m.jsx)(f,{className:`h-4 w-4`}),text:`البعيد ما ينسمع`})]})]})}),(0,m.jsx)(`aside`,{className:`min-w-0 lg:col-span-2`,children:(0,m.jsxs)(`div`,{className:`rounded-3xl border border-line bg-surface p-5`,children:[(0,m.jsx)(`h2`,{className:`font-display text-2xl text-fg`,children:`سكربت اللعبة`}),(0,m.jsx)(`p`,{className:`mt-2 text-sm leading-relaxed text-muted`,children:`حق لعبتك في استوديو روبلوكس. كود واحد لكل لاعب، وزر كتم، وعلامة مايك فوق الراس إذا المايك مفتوح.`}),(0,m.jsxs)(`ol`,{className:`mt-4 grid gap-3 text-sm leading-relaxed text-fg`,children:[(0,m.jsx)(B,{n:`١`,text:`انسخ سكربت السيرفر وحطه في ServerScriptService.`}),(0,m.jsx)(B,{n:`٢`,text:`انسخ سكربت اللاعب وحطه في StarterPlayerScripts.`}),(0,m.jsx)(B,{n:`٣`,text:`من Game Settings فعّل Allow HTTP Requests.`}),(0,m.jsx)(B,{n:`٤`,text:`اضغط كودي، انسخ الكود، والصقه هنا. القائمة تقول مربوط، ومن نفس القائمة تكتم أو تفتح.`})]}),(0,m.jsxs)(`div`,{className:`mt-4 grid gap-2`,children:[(0,m.jsx)(V,{copied:G===`server`,label:`نسخ سكربت السيرفر`,onClick:()=>void Q(`server`,`سكربت السيرفر`,D($))}),(0,m.jsx)(V,{copied:G===`client`,label:`نسخ سكربت اللاعب`,onClick:()=>void Q(`client`,`سكربت اللاعب`,O())})]}),re?(0,m.jsx)(`p`,{className:`mt-3 text-xs leading-relaxed text-muted`,children:`روبلوكس يتصل فقط برابط https. بعد النشر انسخ سكربت السيرفر من الموقع المنشور.`}):null,(0,m.jsxs)(`div`,{className:`mt-5 flex items-center gap-3 rounded-2xl bg-bg p-3`,children:[(0,m.jsx)(I,{}),(0,m.jsxs)(`div`,{children:[(0,m.jsx)(`p`,{className:`text-sm font-semibold text-fg`,children:`علامة فوق الرأس`}),(0,m.jsx)(`p`,{className:`text-xs leading-relaxed text-muted`,children:`تظهر إذا اللاعب مربوط والمايك مفتوح، وتختفي إذا كتم أو طلع.`})]})]}),(0,m.jsxs)(`div`,{className:`mt-4 rounded-2xl border border-line bg-bg p-3`,"aria-hidden":`true`,children:[(0,m.jsx)(`p`,{className:`text-xs text-muted`,children:`معاينة القائمة يسار`}),(0,m.jsxs)(`div`,{className:`mt-2 w-44 rounded-2xl bg-surface p-3`,children:[(0,m.jsx)(`p`,{className:`font-display text-lg text-fg`,children:`وصل`}),(0,m.jsx)(`p`,{className:`text-xs text-brass`,dir:`ltr`,children:`@player`}),(0,m.jsx)(`div`,{className:`mt-2 rounded-xl bg-brass py-2 text-center text-xs font-semibold text-brass-ink`,children:`كودي`}),(0,m.jsx)(`p`,{dir:`ltr`,className:`mt-2 rounded-xl bg-bg py-2 text-center font-display tracking-widest text-brass`,children:`K7M2-Q4NP`}),(0,m.jsx)(`div`,{className:`mt-2 rounded-xl bg-raised py-2 text-center text-xs text-fg`,children:`كتم المايك`})]})]}),(0,m.jsxs)(`details`,{className:`mt-4`,children:[(0,m.jsx)(`summary`,{className:`text-sm text-muted`,children:`عرض السكربتات`}),(0,m.jsx)(`pre`,{dir:`ltr`,className:`mt-3 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted`,children:D($)}),(0,m.jsx)(`pre`,{dir:`ltr`,className:`mt-2 max-h-64 overflow-auto rounded-2xl bg-bg p-3 text-left text-xs leading-relaxed text-muted`,children:O()})]})]})})]}),q?(0,m.jsxs)(`div`,{className:`mt-6 rounded-3xl border border-line bg-surface p-5`,children:[(0,m.jsxs)(`p`,{className:`text-sm font-semibold text-fg`,children:[`انسخ `,q.title,` يدويًا`]}),(0,m.jsx)(`textarea`,{readOnly:!0,dir:`ltr`,value:q.text,className:`mt-3 h-48 w-full rounded-2xl bg-bg p-3 text-left text-xs text-fg`,onFocus:e=>e.currentTarget.select()})]}):null]})}function z({icon:e,text:t}){return(0,m.jsxs)(`li`,{className:`flex items-center gap-2 rounded-2xl bg-bg px-3 py-3 text-xs text-muted`,children:[(0,m.jsx)(`span`,{className:`text-brass`,children:e}),t]})}function B({n:e,text:t}){return(0,m.jsxs)(`li`,{className:`flex gap-3`,children:[(0,m.jsx)(`span`,{className:`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised font-display text-brass`,children:e}),(0,m.jsx)(`span`,{className:`pt-0.5`,children:t})]})}function V({label:e,copied:t,onClick:n}){return(0,m.jsxs)(`button`,{type:`button`,onClick:n,className:`flex h-12 items-center justify-center gap-2 rounded-2xl bg-brass text-sm font-semibold text-brass-ink`,children:[t?(0,m.jsx)(o,{className:`h-4 w-4`}):(0,m.jsx)(s,{className:`h-4 w-4`}),t?`تم النسخ`:e]})}function H(){return(0,m.jsx)(R,{})}export{H as component};