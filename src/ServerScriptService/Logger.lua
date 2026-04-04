-- ServerScriptService/Logger.lua

local Logger = {}

Logger.Levels = {
    DEBUG = 1,
    INFO  = 2,
    WARN  = 3,
    ERROR = 4,
}

-- 🔧 change this to control verbosity
Logger.CurrentLevel = Logger.Levels.INFO

local function now()
    return os.date("%H:%M:%S")
end

local function emit(levelName, levelValue, source, ...)
    if levelValue < Logger.CurrentLevel then return end

    local prefix = string.format("[%s][%s][%s]", levelName, now(), source)
    print(prefix, ...)
end

function Logger.debug(source, ...)
    emit("DEBUG", Logger.Levels.DEBUG, source, ...)
end

function Logger.info(source, ...)
    emit("INFO", Logger.Levels.INFO, source, ...)
end

function Logger.warn(source, ...)
    emit("WARN", Logger.Levels.WARN, source, ...)
end

function Logger.error(source, ...)
    emit("ERROR", Logger.Levels.ERROR, source, ...)
end

return Logger
