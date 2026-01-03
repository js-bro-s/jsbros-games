local Players = game:GetService("Players")
local CollectionService = game:GetService("CollectionService")

local ItemCarry = {}

local function getPrimary(inst)
	if inst:IsA("Model") then
		return inst.PrimaryPart or inst:FindFirstChildWhichIsA("BasePart")
	end
	return inst
end

local function getHoldPart(char)
	return char:FindFirstChild("RightHand")
		or char:FindFirstChild("Right Arm")
		or char:FindFirstChild("HumanoidRootPart")
end

local function setPhysicsHeld(part, held)
	part.CanCollide = not held
	part.CanQuery = true
	part.CanTouch = true
	part.Massless = held
	part.Anchored = false
end

function ItemCarry.isHeld(item)
	return item:GetAttribute("HeldByUserId") ~= nil
end

function ItemCarry.pickup(player, item)
	if not player.Character then return false end
	if not item or not item.Parent then return false end
	if not CollectionService:HasTag(item, "BeltItem") then return false end
	if ItemCarry.isHeld(item) then return false end

	local char = player.Character
	local holdPart = getHoldPart(char)
	if not holdPart then return false end

	local primary = getPrimary(item)
	if not primary then return false end

	-- Mark held
	item:SetAttribute("HeldByUserId", player.UserId)

	-- Make item follow player (weld)
	setPhysicsHeld(primary, true)

	-- Move item to hand
	local offset = CFrame.new(0, -0.5, -1) -- tweak for your item size
	if item:IsA("Model") then
		item:PivotTo(holdPart.CFrame * offset)
	else
		primary.CFrame = holdPart.CFrame * offset
	end

	local weld = Instance.new("WeldConstraint")
	weld.Name = "CarryWeld"
	weld.Part0 = primary
	weld.Part1 = holdPart
	weld.Parent = primary

	-- Optional: hide prompt while held
	local prompt = primary:FindFirstChildWhichIsA("ProximityPrompt")
	if prompt then prompt.Enabled = false end

	return true
end

local function isPointInPartXZ(point, part)
	-- Simple horizontal check using part bounds (works for unrotated zones)
	local size = part.Size
	local c = part.Position
	return math.abs(point.X - c.X) <= size.X/2 and math.abs(point.Z - c.Z) <= size.Z/2
end

local function findOwnedPlot(player)
	local plots = workspace:FindFirstChild("Plots")
	if not plots then return nil end
	for _, plot in ipairs(plots:GetChildren()) do
		local owner = plot:FindFirstChild("OwnerUserId")
		if owner and owner.Value == player.UserId then
			return plot
		end
	end
	return nil
end

function ItemCarry.drop(player, item)
	if not player.Character then return false end
	if not item or not item.Parent then return false end

	local heldBy = item:GetAttribute("HeldByUserId")
	if heldBy ~= player.UserId then
		return false -- prevents dropping someone else's held item
	end

	local primary = getPrimary(item)
	if not primary then return false end

	-- Remove weld
	local weld = primary:FindFirstChild("CarryWeld")
	if weld then weld:Destroy() end

	-- Re-enable prompt
	local prompt = primary:FindFirstChildWhichIsA("ProximityPrompt")
	if prompt then prompt.Enabled = true end

	-- Determine drop location
	local hrp = player.Character:FindFirstChild("HumanoidRootPart")
	if not hrp then return false end

	local plot = findOwnedPlot(player)
	local dropPos = hrp.Position + hrp.CFrame.LookVector * 3

	local placedIn = "World"

	if plot then
		local baseZone = plot:FindFirstChild("BaseDropZone")
		local gardenZone = plot:FindFirstChild("GardenDropZone")

		-- Decide where it is allowed to be placed based on where the player stands
		if baseZone and isPointInPartXZ(hrp.Position, baseZone) then
			placedIn = "Base"
			dropPos = baseZone.Position + Vector3.new(0, 2, 0)
			item.Parent = plot
		elseif gardenZone and isPointInPartXZ(hrp.Position, gardenZone) then
			placedIn = "Garden"
			dropPos = gardenZone.Position + Vector3.new(0, 2, 0)
			item.Parent = plot
		else
			-- Not in a valid zone -> drop in world (or deny drop if you prefer)
			item.Parent = workspace
		end
	end

	-- Apply drop position
	if item:IsA("Model") then
		item:PivotTo(CFrame.new(dropPos))
	else
		primary.CFrame = CFrame.new(dropPos)
	end

	-- Restore physics
	setPhysicsHeld(primary, false)

	-- Unmark held
	item:SetAttribute("HeldByUserId", nil)

	-- You can store where it went (for garden mechanics, etc.)
	item:SetAttribute("PlacedIn", placedIn)

	return true
end

return ItemCarry