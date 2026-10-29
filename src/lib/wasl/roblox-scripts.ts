/** Studio scripts for the owner's own game. Not an executor payload. */

export function serverScript(origin: string): string {
  const api = origin.replace(/["\\\n\r]/g, "");
  return `-- وصل | سكربت السيرفر
-- حطه في ServerScriptService
-- لازم تفعّل Game Settings > Security > Allow HTTP Requests
-- كل لاعب له كود واحد مربوط بحسابه. إذا طلع من اللعبة ينحذف الكود.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API = "${api}/api/wasl"
local ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

local remote = ReplicatedStorage:FindFirstChild("WaslCode")
if not remote then
	remote = Instance.new("RemoteEvent")
	remote.Name = "WaslCode"
	remote.Parent = ReplicatedStorage
end

local codes = {}
local mutes = {}

-- كود ثابت من آيدي الحساب. نفس اللاعب = نفس الكود.
local function codeFromUserId(userId)
	local n = math.floor(userId)
	if n < 0 then
		n = 549755813888 + math.abs(n)
	end
	local chars = table.create(8)
	for i = 8, 1, -1 do
		local index = (n % 32) + 1
		chars[i] = string.sub(ALPH, index, index)
		n = math.floor(n / 32)
	end
	return chars[1] .. chars[2] .. chars[3] .. chars[4] .. "-" .. chars[5] .. chars[6] .. chars[7] .. chars[8]
end

local function finite(n)
	if typeof(n) ~= "number" or n ~= n or n == math.huge or n == -math.huge then
		return 0
	end
	return n
end

local function ensureCode(player)
	local existing = codes[player]
	if existing then
		return existing
	end
	local code = codeFromUserId(player.UserId)
	codes[player] = code
	mutes[player] = mutes[player] == true
	player:SetAttribute("WaslCode", code)
	player:SetAttribute("WaslUserId", tostring(player.UserId))
	player:SetAttribute("WaslMuted", mutes[player])
	if player:GetAttribute("WaslLinked") == nil then
		player:SetAttribute("WaslLinked", false)
	end
	if player:GetAttribute("WaslMic") == nil then
		player:SetAttribute("WaslMic", false)
	end
	remote:FireClient(player, "code", code)
	return code
end

local function markHttp(state, note)
	for player in pairs(codes) do
		if player.Parent == Players then
			player:SetAttribute("WaslHttp", state)
			player:SetAttribute("WaslHttpNote", string.sub(tostring(note or ""), 1, 90))
		end
	end
end

local function rootPosition(player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root then
		return 0, 0, 0, false
	end
	local position = root.Position
	return finite(position.X), finite(position.Y), finite(position.Z), true
end

local function post(body)
	local response = HttpService:RequestAsync({
		Url = API,
		Method = "POST",
		Headers = {
			["Content-Type"] = "application/json",
		},
		Body = HttpService:JSONEncode(body),
	})
	if response.Success ~= true then
		local detail = tostring(response.StatusCode) .. " " .. tostring(response.StatusMessage or "")
		error(detail)
	end
	return response.Body
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
			local x, y, z, placed = rootPosition(player)
			table.insert(list, {
				code = code,
				username = player.Name,
				userId = tostring(player.UserId),
				muted = mutes[player] == true,
				x = x,
				y = y,
				z = z,
				placed = placed,
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
	if not ok then
		local message = tostring(result)
		warn("[وصل] " .. message)
		local lower = string.lower(message)
		if string.find(lower, "not enabled", 1, true) or string.find(lower, "game settings", 1, true) then
			markHttp("off", "اضغط Save بعد تفعيل HTTP ثم أعد Play")
		else
			markHttp("bad", message)
		end
		return
	end

	local decodedOk, decoded = pcall(function()
		return HttpService:JSONDecode(result)
	end)
	if not decodedOk or typeof(decoded) ~= "table" or typeof(decoded.players) ~= "table" then
		markHttp("bad", "رد الموقع مو مفهوم")
		return
	end
	markHttp("ok", "")

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

Players.PlayerAdded:Connect(function(player)
	ensureCode(player)
	task.spawn(sync)
end)

for _, player in Players:GetPlayers() do
	ensureCode(player)
end

task.spawn(function()
	while true do
		task.wait(1)
		sync()
	end
end)
`;
}

export function clientScript(): string {
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
who.Text = "@" .. player.Name .. "  #" .. tostring(player.UserId)
who.TextColor3 = BRASS
who.TextSize = 13
who.TextTruncate = Enum.TextTruncate.AtEnd
who.TextXAlignment = Enum.TextXAlignment.Right
who.Parent = panel

local hint = Instance.new("TextLabel")
hint.BackgroundTransparency = 1
hint.Position = UDim2.fromOffset(16, 62)
hint.Size = UDim2.new(1, -32, 0, 32)
hint.Font = Enum.Font.Gotham
hint.Text = "الكود من آيدي حسابك، ويطلع أول ما تدخل الماب."
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
status.Text = "نتعرف على آيديك داخل الماب…"
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
		status.Text = "نتعرف على آيديك داخل الماب…"
		status.TextColor3 = MUTED
	elseif player:GetAttribute("WaslLinked") == true and player:GetAttribute("WaslMuted") == true then
		status.Text = "مربوط. المايك مكتوم وما أحد يسمعك."
		status.TextColor3 = IVORY
	elseif player:GetAttribute("WaslLinked") == true then
		status.Text = "مربوط. تقدر تتكلم، واللي بعيد عنك ما يسمعك."
		status.TextColor3 = BRASS
	elseif player:GetAttribute("WaslHttp") == "off" then
		status.Text = "HTTP مقفل. فعّله، اضغط Save، وأعد Play."
		status.TextColor3 = MUTED
	elseif player:GetAttribute("WaslHttp") == "bad" then
		local note = player:GetAttribute("WaslHttpNote")
		status.Text = "الإرسال فشل. " .. (typeof(note) == "string" and note or "شوف Output")
		status.TextColor3 = MUTED
	elseif player:GetAttribute("WaslHttp") == "ok" then
		status.Text = "تعرفنا على آيديك. الصق الكود في الموقع."
		status.TextColor3 = IVORY
	elseif remote == nil then
		status.Text = "حط سكربت السيرفر وفعّل Allow HTTP Requests"
		status.TextColor3 = MUTED
	else
		status.Text = "نرسل آيديك للموقع…"
		status.TextColor3 = MUTED
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
			refreshStatus()
		end
	end)
	remote:FireServer("want")
end

local function pullCode()
	local code = player:GetAttribute("WaslCode")
	if typeof(code) == "string" and code ~= "" then
		currentCode = code
		box.Text = code
		refreshStatus()
	end
end

player:GetAttributeChangedSignal("WaslCode"):Connect(pullCode)
player:GetAttributeChangedSignal("WaslHttp"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslHttpNote"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslLinked"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslMuted"):Connect(refreshStatus)
player:GetAttributeChangedSignal("WaslMic"):Connect(refreshStatus)

pullCode()
refreshStatus()
`;
}
