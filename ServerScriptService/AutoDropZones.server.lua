print("AutoDropZones loaded")

local function getPrimary(inst: Instance): BasePart?
	if inst:IsA("Model") then
		return inst.PrimaryPart or inst:FindFirstChildWhichIsA("BasePart")
	end
	if inst:IsA("BasePart") then return inst end
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

local function findOwnedPlot(userId: number): Instance?
	local plots = workspace:FindFirstChild("Plots")
	if not plots then return nil end
	for _, plot in ipairs(plots:GetChildren()) do
		local owner = plot:FindFirstChild("OwnerUserId")
		if owner and owner:IsA("NumberValue") and owner.Value == userId then
			return plot
		end
	end
	return nil
end

local function removeCarryWeld(item: Instance)
	local p = getPrimary(item)
	if not p then return end
	local w = p:FindFirstChild("CarryWeld")
	if w then w:Destroy() end
	local prompt = p:FindFirstChild("GrabPrompt")
	if prompt and prompt:IsA("ProximityPrompt") then
		prompt.Enabled = true
	end
end

local function nextFreeGardenCell(plot: Instance): BasePart?
	local folder = plot:FindFirstChild("GardenCells")
	if not folder then return nil end

	-- choose first unoccupied cell (attribute-based)
	for _, cell in ipairs(folder:GetChildren()) do
		if cell:IsA("BasePart") and not cell:GetAttribute("Occupied") then
			return cell
		end
	end
	return nil
end

local function placeIntoCell(plot: Instance, item: Instance, cell: BasePart)
	local p = getPrimary(item)
	if not p then return end

	local itemSize = item:IsA("Model") and item:GetExtentsSize() or p.Size
	local topY = cell.Position.Y + (cell.Size.Y / 2)
	local dropPos = Vector3.new(cell.Position.X, topY + (itemSize.Y / 2) + 0.05, cell.Position.Z)

	-- parent item into plot for ownership
	item.Parent = plot
	item:SetAttribute("OwnerUserId", plot.OwnerUserId.Value)
	item:SetAttribute("PlacedIn", "Garden")
	item:SetAttribute("CellName", cell.Name)

	-- occupy cell
	cell:SetAttribute("Occupied", true)
	cell:SetAttribute("ItemId", item:GetDebugId())

	-- place item
	if item:IsA("Model") then
		item:PivotTo(CFrame.new(dropPos))
	else
		p.CFrame = CFrame.new(dropPos)
	end

	-- keep stable in grid
	setAnchoredAll(item, true)
end

local function dropToWorld(player, item)
	local char = player.Character
	if not char then return end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end

	local p = getPrimary(item)
	if not p then return end

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
end

-- Debounce so stepping in trigger doesn't fire 20 times
local lastTriggerAt: {[number]: number} = {}
local COOLDOWN = 0.4

local function canTrigger(userId: number)
	local t = os.clock()
	if lastTriggerAt[userId] and (t - lastTriggerAt[userId]) < COOLDOWN then
		return false
	end
	lastTriggerAt[userId] = t
	return true
end

local function handleAutoDrop(player, plot, kind: "Base" | "Garden")
	if not canTrigger(player.UserId) then return end

	local item = findHeldItemByUserId(player.UserId)
	if not item or not item.Parent then return end
	if item:GetAttribute("HeldByUserId") ~= player.UserId then return end

	-- stop carrying
	removeCarryWeld(item)
	item:SetAttribute("HeldByUserId", nil)

	if kind == "Garden" then
		local cell = nextFreeGardenCell(plot)
		if cell then
			placeIntoCell(plot, item, cell)
		else
			-- no space: drop at feet (or you can reject)
			dropToWorld(player, item)
		end
	else
		-- Base auto-drop: for now, just drop into plot (easy)
		-- If you want BaseCells like GardenCells, tell me and I’ll mirror it.
		item.Parent = plot
		item:SetAttribute("OwnerUserId", plot.OwnerUserId.Value)
		item:SetAttribute("PlacedIn", "Base")
		setAnchoredAll(item, true)
	end
end

-- Wire triggers for all plots
local plots = workspace:WaitForChild("Plots")

for _, plot in ipairs(plots:GetChildren()) do
	local owner = plot:FindFirstChild("OwnerUserId")
	if not owner or not owner:IsA("NumberValue") then
		continue
	end

	local baseTrig = plot:FindFirstChild("BaseAutoDropTrigger")
	local gardenTrig = plot:FindFirstChild("GardenAutoDropTrigger")

	if baseTrig and baseTrig:IsA("BasePart") then
		baseTrig.Touched:Connect(function(hit)
			local player = game.Players:GetPlayerFromCharacter(hit.Parent)
			if not player then return end
			if owner.Value ~= player.UserId then return end
			handleAutoDrop(player, plot, "Base")
		end)
	end

	if gardenTrig and gardenTrig:IsA("BasePart") then
		gardenTrig.Touched:Connect(function(hit)
			local player = game.Players:GetPlayerFromCharacter(hit.Parent)
			if not player then return end
			if owner.Value ~= player.UserId then return end
			handleAutoDrop(player, plot, "Garden")
		end)
	end
end