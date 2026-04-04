print("Red Belt Loaded")


local RunService = game:GetService("RunService")
local ServerStorage = game:GetService("ServerStorage")

local beltFolder = workspace:WaitForChild("RedBelt")

local beltPart = beltFolder:WaitForChild("Belt") -- Part (the red conveyor)

local function asPart(inst: Instance): BasePart
	if inst:IsA("BasePart") then return inst end
	if inst:IsA("Model") then
		return inst.PrimaryPart or inst:FindFirstChildWhichIsA("BasePart")
	end
	error(("Start/End must be a Part or Model containing a Part. Got %s"):format(inst.ClassName))
end

local startInst = beltFolder:WaitForChild("Start")
local endInst   = beltFolder:WaitForChild("End")

local startPart = asPart(startInst)
local endPart   = asPart(endInst)
local itemFolder = ServerStorage:WaitForChild("ConveyorItems")

local SPEED = 12              -- studs/sec
local SPAWN_EVERY = 1.0       -- seconds
local MAX_ON_BELT = 15

local active = {}



print("Start class:", startPart.ClassName, "IsA BasePart?", startPart:IsA("BasePart"))
print("End class:", endPart.ClassName, "IsA BasePart?", endPart:IsA("BasePart"))




local function getPrimary(inst: Instance): BasePart
	if inst:IsA("Model") then
		return inst.PrimaryPart or inst:FindFirstChildWhichIsA("BasePart")
	end
	return inst :: BasePart
end





local Players = game:GetService("Players")

local function getHoldPart(char: Model): BasePart?
	return char:FindFirstChild("RightHand")
		or char:FindFirstChild("Right Arm")
		or char:FindFirstChild("HumanoidRootPart")
end

local function setAnchoredAll(item: Instance, anchored: boolean)
	if item:IsA("Model") then
		for _, d in ipairs(item:GetDescendants()) do
			if d:IsA("BasePart") then
				d.Anchored = anchored
				d.CanCollide = not anchored
			end
		end
	else
		local p = item :: BasePart
		p.Anchored = anchored
		p.CanCollide = not anchored
	end
end

local function removeFromActive(item: Instance)
	for i = #active, 1, -1 do
		if active[i] == item then
			table.remove(active, i)
			return
		end
	end
end

local function attachGrabPrompt(item: Instance)
	local p = getPrimary(item)
	if not p then return end

	local prompt = p:FindFirstChild("GrabPrompt") or Instance.new("ProximityPrompt")
	prompt.Name = "GrabPrompt"
	prompt.ActionText = "Grab"
	prompt.ObjectText = item.Name
	prompt.MaxActivationDistance = 10
	prompt.HoldDuration = 0
	prompt.RequiresLineOfSight = false
	prompt.Parent = p

	prompt.Triggered:Connect(function(player)
		-- Server-side validation
		if not player.Character then return end
		if item:GetAttribute("HeldByUserId") then return end

		local holdPart = getHoldPart(player.Character)
		if not holdPart then return end

		-- Stop belt control for this item
		removeFromActive(item)

		-- Mark held + disable prompt
		item:SetAttribute("HeldByUserId", player.UserId)
		prompt.Enabled = false

		-- Unanchor so weld can move naturally
		setAnchoredAll(item, false)

		-- Move to hand and weld
		local dir = (endPart.Position - startPart.Position).Unit
		local carryOffset = CFrame.new(0, -0.5, -1) -- tweak for your item size
		local carryCFrame = CFrame.lookAt(holdPart.Position, holdPart.Position + dir) * carryOffset

		if item:IsA("Model") then
			item:PivotTo(carryCFrame)
		else
			(p :: BasePart).CFrame = carryCFrame
		end

		local weld = Instance.new("WeldConstraint")
		weld.Name = "CarryWeld"
		weld.Part0 = p
		weld.Part1 = holdPart
		weld.Parent = p
	end)
end







local GAP = 20 -- studs between items (tune this)


--- Spawn an item at Start, facing toward End.
local function spawnItem()
	print("Spawning item...")
	print("Candidates:", #itemFolder:GetChildren())

	if #active >= MAX_ON_BELT then return end

	local candidates = itemFolder:GetChildren()
	if #candidates == 0 then return end

	local template = candidates[math.random(1, #candidates)]
	local item = template:Clone()
	item.Parent = workspace

	local p = getPrimary(item)
	if not p then
		warn("Item has no BasePart:", item.Name)
		item:Destroy()
		return
	end

	if item:IsA("Model") and not item.PrimaryPart then
		item.PrimaryPart = p
	end

	-- 🔴 BELT-AWARE SPAWN POSITION
	local beltPart = beltFolder:WaitForChild("Belt") -- your conveyor part

	-- Belt surface Y
	local beltTopY = beltPart.Position.Y + (beltPart.Size.Y / 2)

	-- Item size
	local itemSize = item:IsA("Model") and item:GetExtentsSize() or p.Size
	local spawnY = beltTopY + (itemSize.Y / 2) + 0.05

	-- Spawn at Start XZ
	local spawnPos = Vector3.new(
		startPart.Position.X,
		spawnY,
		startPart.Position.Z
	)

	-- Face toward End
	local dir = (endPart.Position - startPart.Position).Unit
	local spawnCFrame = CFrame.lookAt(spawnPos, spawnPos + dir)

	if item:IsA("Model") then
		item:PivotTo(spawnCFrame)
	else
		p.CFrame = spawnCFrame
	end

	-- 🔒 Anchor + disable collision
	if item:IsA("Model") then
		for _, d in ipairs(item:GetDescendants()) do
			if d:IsA("BasePart") then
				d.Anchored = true
				d.CanCollide = false
			end
		end
	else
		p.Anchored = true
		p.CanCollide = false
	end
	
	--- Attach prompt
	attachGrabPrompt(item)

    --- Insert item
	table.insert(active, item)
end


--- Spawn loop
task.spawn(function()
	while true do
		spawnItem()

		local waitTime = SPAWN_EVERY
		local last = active[#active]
		if last then
			local lp = getPrimary(last)
			if lp then
				local sizeZ = last:IsA("Model")
					and last:GetExtentsSize().Z
					or lp.Size.Z
				waitTime = (sizeZ + GAP) / SPEED
			end
		end

		task.wait(waitTime)
	end
end)


--- Heartbeat: move items forward
RunService.Heartbeat:Connect(function(dt)
	local startPos = startPart.Position
	local endPos = endPart.Position
	local dir = (endPos - startPos)
	local dist = dir.Magnitude
	if dist < 0.01 then return end
	dir = dir.Unit

	for i = #active, 1, -1 do
		local item = active[i]
		if not item or not item.Parent then
			table.remove(active, i)
			continue
		end

		local p = getPrimary(item)
		local pos = p.Position
		local along = (pos - startPos):Dot(dir)

		-- Move forward
		local newPos = pos + dir * SPEED * dt

		-- Keep orientation aligned to belt direction
		local look = CFrame.lookAt(newPos, newPos + dir)
		if item:IsA("Model") then
			item:PivotTo(look)
		else
			p.CFrame = look
		end

		-- Despawn when past the end
		if along > dist + 2 then
			item:Destroy()
			table.remove(active, i)
		end
		
		if item:GetAttribute("HeldByUserId") then
			table.remove(active, i)
			continue
		end
	end
end)


 --- Heartbeat: print count every second
local t = 0
RunService.Heartbeat:Connect(function(dt)
	t += dt
	if t > 1 then
		t = 0
		print("Active items:", #active)
	end
	-- ... rest of your Heartbeat
end)