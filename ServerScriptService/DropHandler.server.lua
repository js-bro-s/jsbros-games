local Logger = require(game.ServerScriptService.Logger)

Logger.info("DropHandler", "Loaded");


local ReplicatedStorage = game:GetService("ReplicatedStorage")
local dropEvent = ReplicatedStorage:WaitForChild("DropHeldItem")

-- ===== Helpers =====

local function getPrimary(inst: Instance): BasePart?
	if inst:IsA("Model") then
		return inst.PrimaryPart or inst:FindFirstChildWhichIsA("BasePart")
	end
	if inst:IsA("BasePart") then
		return inst
	end
	return nil
end

local function setAnchoredAll(item: Instance, anchored: boolean)
	if item:IsA("Model") then
		for _, d in ipairs(item:GetDescendants()) do
			if d:IsA("BasePart") then
				d.Anchored = anchored
				d.CanCollide = not anchored
				d.Massless = anchored and true or false
			end
		end
	else
		local p = item :: BasePart
		p.Anchored = anchored
		p.CanCollide = not anchored
		p.Massless = anchored and true or false
	end
end

local function findHeldItemByUserId(userId: number): Instance?
	for _, inst in ipairs(workspace:GetDescendants()) do
		if inst:GetAttribute("HeldByUserId") == userId then
			return inst
		end
	end
	return nil
end

-- Works with rotated parts
local function pointInPart(point: Vector3, part: BasePart): boolean
	local localPos = part.CFrame:PointToObjectSpace(point)
	local half = part.Size * 0.5
	return math.abs(localPos.X) <= half.X
		and math.abs(localPos.Y) <= half.Y
		and math.abs(localPos.Z) <= half.Z
end

local function findOwnedPlot(playerUserId: number): Instance?
	local plots = workspace:FindFirstChild("Plots")
	if not plots then return nil end

	for _, plot in ipairs(plots:GetChildren()) do
		local owner = plot:FindFirstChild("OwnerUserId")
		if owner and owner:IsA("NumberValue") and owner.Value == playerUserId then
			return plot
		end
	end
	return nil
end

local function snapDrop(item: Instance, p: BasePart, plot: Instance, zone: BasePart, placedIn: string)
	-- Move item to zone center, sitting on top of zone
	local itemSize = item:IsA("Model") and item:GetExtentsSize() or p.Size
	local zoneTopY = zone.Position.Y + (zone.Size.Y / 2)
	local dropPos = Vector3.new(zone.Position.X, zoneTopY + (itemSize.Y / 2) + 0.05, zone.Position.Z)

	-- Parent into plot (so “your base owns it”)
	item.Parent = plot

	-- Mark ownership / placement
	item:SetAttribute("OwnerUserId", plot.OwnerUserId.Value)
	item:SetAttribute("PlacedIn", placedIn)

	-- Place it
	if item:IsA("Model") then
		item:PivotTo(CFrame.new(dropPos))
	else
		p.CFrame = CFrame.new(dropPos)
	end

	-- Usually keep placed items anchored (looks clean + stable)
	setAnchoredAll(item, true)
end

-- ===== Drop handler =====

dropEvent.OnServerEvent:Connect(function(player)
	local char = player.Character
	if not char then return end

	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local item = findHeldItemByUserId(player.UserId)
	if not item or not item.Parent then return end

	local p = getPrimary(item)
	if not p then return end

	-- Only allow the holder to drop it
	if item:GetAttribute("HeldByUserId") ~= player.UserId then return end

	-- Remove weld to hand (if any)
	local carryWeld = p:FindFirstChild("CarryWeld")
	if carryWeld then carryWeld:Destroy() end

	-- Re-enable grab prompt
	local prompt = p:FindFirstChild("GrabPrompt")
	if prompt and prompt:IsA("ProximityPrompt") then
		prompt.Enabled = true
	end

	-- Unmark held
	item:SetAttribute("HeldByUserId", nil)

	-- Snap to owned plot zones if standing inside
	local plot = findOwnedPlot(player.UserId)
	if plot then
		local baseZone = plot:FindFirstChild("BaseDropZone")
		local gardenZone = plot:FindFirstChild("GardenDropZone")

		if baseZone and baseZone:IsA("BasePart") and pointInPart(hrp.Position, baseZone) then
			snapDrop(item, p, plot, baseZone, "Base")
			return
		end

		if gardenZone and gardenZone:IsA("BasePart") and pointInPart(hrp.Position, gardenZone) then
			snapDrop(item, p, plot, gardenZone, "Garden")
			return
		end
	end

	-- Otherwise: world drop in front of player
	item.Parent = workspace
	item:SetAttribute("PlacedIn", "World")

	local dropPos = hrp.Position + hrp.CFrame.LookVector * 4 + Vector3.new(0, 1.5, 0)

	if item:IsA("Model") then
		item:PivotTo(CFrame.new(dropPos))
	else
		p.CFrame = CFrame.new(dropPos)
	end

	setAnchoredAll(item, false)
	p.AssemblyLinearVelocity = hrp.CFrame.LookVector * 10
end)