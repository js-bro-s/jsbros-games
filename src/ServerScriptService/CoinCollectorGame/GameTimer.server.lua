-- GameTimer.server.lua
-- 60 second countdown, then announces winner

local GAME_DURATION = 60

task.wait(2) -- Let everything else load first

print("Game started! " .. GAME_DURATION .. " seconds!")

-- Countdown
for timeLeft = GAME_DURATION, 1, -1 do
	if timeLeft <= 10 then
		print(timeLeft .. " seconds left!")
	end
	task.wait(1)
end

-- Find the winner
print("Time's up!")

local winner = nil
local highScore = 0

for _, player in ipairs(game.Players:GetPlayers()) do
	local score = _G.getScore(player)
	if score > highScore then
		highScore = score
		winner = player
	end
end

if winner then
	print("Winner: " .. winner.Name .. " with " .. highScore .. " coins!")
else
	print("No winner — nobody collected any coins!")
end
