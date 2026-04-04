local Logger = require(game.ServerScriptService.Logger)

Logger.info("AutoDrop", "Loaded")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local feedback = ReplicatedStorage:WaitForChild("ItemFeedback")

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

local function nextFreeCell(plot: Instance, folderName: string): BasePart?
	local folder = plot:FindFirstChild(folderName)
	if not folder then return nil end

	for _, cell in ipairs(folder:GetChildren()) do
		if cell:IsA("BasePart") and not cell:GetAttribute("Occupied") then
			return cell
		end
	end
	return nil
end


local function placeIntoCell(plot: Instance, item: Instance, cell: BasePart, placedIn: string)
	
	local p = getPrimary(item)
	if not p then return end

	local itemSize = item:IsA("Model") and item:GetExtentsSize() or p.Size
	local topY = cell.Position.Y + (cell.Size.Y / 2)
	local dropPos = Vector3.new(cell.Position.X, topY + (itemSize.Y / 2) + 0.05, cell.Position.Z)

	item.Parent = plot
	item:SetAttribute("OwnerUserId", plot.OwnerUserId.Value)
	item:SetAttribute("PlacedIn", placedIn)
	item:SetAttribute("CellName", cell.Name)

	cell:SetAttribute("Occupied", true)
	cell:SetAttribute("ItemId", item:GetDebugId())

	if item:IsA("Model") then
		item:PivotTo(CFrame.new(dropPos))
	else
		p.CFrame = CFrame.new(dropPos)
	end

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

-- Handle auto drop and  Find held item by UserId
local function handleAutoDrop(player, plot, kind: "Base" | "Garden")
	Logger.debug("AutoDrop", "handleAutoDrop start", player.Name, kind)
	if not canTrigger(player.UserId) then return end
	

	
	local item = findHeldItemByUserId(player.UserId)
	if not item then
		Logger.debug("AutoDrop", "No held item found")
		return
	end

	if item:GetAttribute("HeldByUserId") ~= player.UserId then
		Logger.debug("AutoDrop", "Held item mismatch")
		return
	end

	-- stop carrying
	removeCarryWeld(item)
	item:SetAttribute("HeldByUserId", nil)

	if player.Character then
	    player.Character:SetAttribute("HoldingItem", false)
	end

-- Garden drop
	if kind == "Garden" then
		local cell = nextFreeCell(plot, "GardenCells")
		if cell then
			Logger.debug("AutoDrop", "Attempting cell placement:", kind)
			placeIntoCell(plot, item, cell, "Garden")
			feedback:FireClient(player, "Placed", kind)
		else
			dropToWorld(player, item)
			feedback:FireClient(player, "NoSpace", kind)
		end
		
	
	-- Base Drop	
	else
		local cell = nextFreeCell(plot, "BaseCells")
		if cell then
			Logger.debug("AutoDrop", "Attempting cell placement:", kind)
			placeIntoCell(plot, item, cell, "Base")
			feedback:FireClient(player, "Placed", kind)
		else
			dropToWorld(player, item)
			feedback:FireClient(player, "NoSpace", kind)
		end
		
	end
end

-- Wire triggers for all plots
local plots = workspace:WaitForChild("Plots")

for _, plot in ipairs(plots:GetChildren()) do
	
	
	local baseTrig = plot:FindFirstChild("BaseAutoDropTrigger")
	local gardenTrig = plot:FindFirstChild("GardenAutoDropTrigger")
	local owner = plot:FindFirstChild("OwnerUserId")
	
	if not owner or not owner:IsA("NumberValue") then
		continue
	end

	
	
	Logger.debug("AutoDrop", "Wiring plot", plot.Name)
	
	-- Sanity check: warn if missing, but don't fail
	if not baseTrig then Logger.warn("AutoDrop", plot.Name .. " missing BaseAutoDropTrigger") end
	if not gardenTrig then Logger.warn("AutoDrop", plot.Name .. " missing GardenAutoDropTrigger") end

	if baseTrig and baseTrig:IsA("BasePart") then
	    Logger.debug("AutoDrop", "BaseTrig props", "CanTouch=", baseTrig.CanTouch, "CanCollide=", baseTrig.CanCollide, "Transparency=", baseTrig.Transparency)
	end
	if gardenTrig and gardenTrig:IsA("BasePart") then
	    Logger.debug("AutoDrop", "GardenTrig props", "CanTouch=", gardenTrig.CanTouch, "CanCollide=", gardenTrig.CanCollide, "Transparency=", gardenTrig.Transparency)
	end

	if baseTrig and baseTrig:IsA("BasePart") then
		baseTrig.Touched:Connect(function(hit)
			local player = game.Players:GetPlayerFromCharacter(hit.Parent)
			if not player then return end

			Logger.debug("AutoDrop", "Base trigger touched by", player.Name)

			if owner.Value ~= player.UserId then
				Logger.debug("AutoDrop", "Touch ignored (not owner)")
				return
			end

			handleAutoDrop(player, plot, "Base")
		end)
	end

	if gardenTrig and gardenTrig:IsA("BasePart") then
		gardenTrig.Touched:Connect(function(hit)
			local player = game.Players:GetPlayerFromCharacter(hit.Parent)
			if not player then return end

			Logger.debug("AutoDrop", "Garden trigger touched by", player.Name)

			if owner.Value ~= player.UserId then
				Logger.debug("AutoDrop", "Touch ignored (not owner)")
				return
			end

			handleAutoDrop(player, plot, "Garden")
		end)
	end
end
