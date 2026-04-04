-- ScoreTracker.server.lua
-- Tracks each player's score

local scores = {}

local function getScore(player)
	if scores[player.Name] == nil then
		scores[player.Name] = 0
	end
	return scores[player.Name]
end

local function addScore(player, amount)
	scores[player.Name] = getScore(player) + amount
	print(player.Name .. " — Score: " .. scores[player.Name])
end

-- Make these accessible to other scripts via _G
_G.getScore = getScore
_G.addScore = addScore
