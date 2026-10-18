-- Character Suite: shared helpers, the saved data, slash commands.
-- Lua 5.1 syntax, retail 12.x-style API. No combat log, no protected API, no automation.
local addonName, ns = ...

ns.VERSION = "0.1.0"
ns.SCHEMA = 1
ns.SITE = "realworldbuilder.github.io/wow-character-suite/make"
ns.COMMANDS = {}
ns.failedEvents = {}

-- Values -------------------------------------------------------------------------------------------------------

function ns.IsSecret(v)
  if issecretvalue then
    local ok, secret = pcall(issecretvalue, v)
    return ok and secret
  end
  return false
end

-- Only strings, numbers and booleans are ever stored; secret values never.
function ns.Clean(v)
  local t = type(v)
  if t ~= "string" and t ~= "number" and t ~= "boolean" then return nil end
  if ns.IsSecret(v) then return nil end
  if t == "number" and v ~= v then return nil end -- NaN
  return v
end

function ns.CleanString(v, max)
  v = ns.Clean(v)
  if type(v) == "number" then v = tostring(v) end
  if type(v) ~= "string" or v == "" then return nil end
  v = v:gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", "")
  if max and #v > max then v = v:sub(1, max) end
  return v
end

function ns.Round(v, places)
  v = ns.Clean(v)
  if type(v) ~= "number" then return nil end
  local m = 10 ^ (places or 0)
  return math.floor(v * m + 0.5) / m
end

-- pcall that returns the function's results, or nothing when it is missing or throws.
function ns.SafeCall(fn, ...)
  if type(fn) ~= "function" then return nil end
  local res = { pcall(fn, ...) }
  if not res[1] then return nil end
  return unpack(res, 2)
end

function ns.SafeRegister(frame, event)
  local ok = pcall(frame.RegisterEvent, frame, event)
  if not ok then table.insert(ns.failedEvents, event) end
  return ok
end

function ns.Print(msg)
  if DEFAULT_CHAT_FRAME then DEFAULT_CHAT_FRAME:AddMessage("|cffd9a760Character Suite|r " .. msg) end
end

-- The character -------------------------------------------------------------------------------------------------

-- Forever builds since 70009 return the surname where mainline returns the realm: UnitFullName -> "Rambleon", "Birdsong".
local function surname(c)
  local r, name = c.realmFromFullName, c.name
  if type(r) ~= "string" or r == "" or type(name) ~= "string" or name:find(" ", 1, true) then return nil end
  if r == c.realm or r == c.normalizedRealm then return nil end
  if type(c.realm) == "string" and r == (c.realm:gsub("%s+", "")) then return nil end
  return r
end

function ns.CaptureCharacter()
  local c = {}
  c.name = ns.CleanString(ns.SafeCall(UnitName, "player"))
  local _, second = ns.SafeCall(UnitFullName, "player")
  c.realmFromFullName = ns.CleanString(second)
  c.realm = ns.CleanString(ns.SafeCall(GetRealmName))
  c.normalizedRealm = ns.CleanString(ns.SafeCall(GetNormalizedRealmName))
  c.race, c.raceFile = ns.SafeCall(UnitRace, "player")
  c.race, c.raceFile = ns.CleanString(c.race), ns.CleanString(c.raceFile)
  c.class, c.classFile = ns.SafeCall(UnitClass, "player")
  c.class, c.classFile = ns.CleanString(c.class), ns.CleanString(c.classFile)
  c.faction = ns.CleanString(ns.SafeCall(UnitFactionGroup, "player"))
  local sex = ns.Clean(ns.SafeCall(UnitSex, "player"))
  c.gender = (sex == 2 and "male") or (sex == 3 and "female") or nil
  c.level = ns.Clean(ns.SafeCall(UnitLevel, "player"))
  c.guid = ns.CleanString(ns.SafeCall(UnitGUID, "player"))
  c.surname = surname(c)
  c.displayName = c.name
  if c.surname and c.name and c.name:sub(-#c.surname) ~= c.surname then c.displayName = c.name .. " " .. c.surname end
  if ns.SafeCall(UnitExists, "pet") then c.pet = ns.CleanString(ns.SafeCall(UnitName, "pet")) end
  return c
end

-- Saved data ----------------------------------------------------------------------------------------------------

function ns.InitDB()
  if type(CharacterSuiteDB) ~= "table" then CharacterSuiteDB = {} end
  local db = CharacterSuiteDB
  db.schemaVersion = db.schemaVersion or ns.SCHEMA
  db.addonVersion = ns.VERSION
  if type(db.bars) ~= "table" then db.bars = {} end
  ns.db = db
end

-- Slash commands ------------------------------------------------------------------------------------------------

local function help()
  ns.Print("commands:")
  for _, c in ipairs(ns.COMMANDS) do ns.Print("  /suite " .. c.name .. " - " .. c.help) end
end

SLASH_CHARACTERSUITE1 = "/suite"
SLASH_CHARACTERSUITE2 = "/charsuite"
SlashCmdList.CHARACTERSUITE = function(msg)
  local word, rest = (msg or ""):match("^%s*(%S*)%s*(.-)%s*$")
  word = (word or ""):lower()
  for _, c in ipairs(ns.COMMANDS) do
    if c.name == word then return c.run(rest) end
  end
  help()
end

-- Boot ----------------------------------------------------------------------------------------------------------

ns.frame = CreateFrame("Frame")
ns.handlers = {}
ns.frame:SetScript("OnEvent", function(_, event, ...)
  local h = ns.handlers[event]
  if h then h(...) end
end)

function ns.On(event, fn)
  if ns.SafeRegister(ns.frame, event) then ns.handlers[event] = fn end
end

ns.On("ADDON_LOADED", function(name)
  if name ~= addonName then return end
  ns.InitDB()
end)

ns.On("PLAYER_LOGIN", function()
  if not ns.db then ns.InitDB() end
  if not ns.db.welcomed then
    ns.db.welcomed = true
    ns.Print("is here. Type /suite bars to capture your action bars, then open " .. ns.SITE)
  end
end)
