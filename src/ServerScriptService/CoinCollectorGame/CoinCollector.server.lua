-- CoinCollector.server.lua
-- Handles what happens when a player touches a coin

local SPAWN_AREA = 40
local RESPAWN_DELAY = 3

local function onCoinTouched(coin, hit)
	local character = hit.Parent
	local player = game.Players:GetPlayerFromCharacter(character)

	if player then
		coin:Destroy()
		_G.addScore(player, 1)

		-- Respawn a new coin after a short delay
		task.delay(RESPAWN_DELAY, function()
			local newCoin = Instance.new("Part")
			newCoin.Name = "Coin"
			newCoin.Shape = Enum.PartType.Ball
			newCoin.Size = Vector3.new(2, 2, 2)
			newCoin.BrickColor = BrickColor.new("Bright yellow")
			newCoin.Material = Enum.Material.Neon
			newCoin.Anchored = true

			local x = math.random(-SPAWN_AREA, SPAWN_AREA)
			local z = math.random(-SPAWN_AREA, SPAWN_AREA)
			newCoin.Position = Vector3.new(x, 1.5, z)
			newCoin.Parent = workspace

			-- Connect touch event to the new coin
			newCoin.Touched:Connect(function(h)
				onCoinTouched(newCoin, h)
			end)
		end)
	end
end

-- Wait for CoinSpawner to finish, then connect touch events
task.wait(1)

for _, coin in ipairs(workspace:GetChildren()) do
	if coin.Name == "Coin" then
		coin.Touched:Connect(function(hit)
			onCoinTouched(coin, hit)
		end)
	end
end
