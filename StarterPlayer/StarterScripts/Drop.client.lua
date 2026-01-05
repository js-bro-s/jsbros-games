local Logger = require(game.ReplicatedStorage:WaitForChild("Logger"))

Logger.info("Drop.client", "Loaded")

local UIS = game:GetService("UserInputService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local dropEvent = ReplicatedStorage:WaitForChild("DropHeldItem")

UIS.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode ~= Enum.KeyCode.G then return end

    local char = player.Character
    if not char then return end

    if not char:GetAttribute("HoldingItem") then
        Logger.debug("Drop.client", "G pressed but no item held")
        return
    end

    Logger.debug("Drop.client", "G pressed, dropping held item")
    dropEvent:FireServer()
end)
