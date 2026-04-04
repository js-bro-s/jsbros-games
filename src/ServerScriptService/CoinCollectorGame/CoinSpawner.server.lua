-- CoinSpawner.server.lua
-- Spawns coins randomly around the map

local COIN_COUNT = 10
local SPAWN_AREA = 40 -- how far from center coins can appear

local function spawnCoin()
	local coin = Instance.new("Part")
	coin.Name = "Coin"
	coin.Shape = Enum.PartType.Ball
	coin.Size = Vector3.new(2, 2, 2)
	coin.BrickColor = BrickColor.new("Bright yellow")
	coin.Material = Enum.Material.Neon
	coin.Anchored = true

	-- Random position within the spawn area
	local x = math.random(-SPAWN_AREA, SPAWN_AREA)
	local z = math.random(-SPAWN_AREA, SPAWN_AREA)
	coin.Position = Vector3.new(x, 1.5, z)

	coin.Parent = workspace
	return coin
end

-- Spawn all coins at game start
for i = 1, COIN_COUNT do
	spawnCoin()
end

print("Spawned " .. COIN_COUNT .. " coins!")
