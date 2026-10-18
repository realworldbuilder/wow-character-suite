-- Offline test: load Character Suite under a tiny WoW stub, run /suite bars on Rambleon Birdsong's real layout
-- (level 30 Night Elf Hunter, 2026-10-16), check the snapshot, and write a Blizzard-format SavedVariables
-- fixture for the web page's tests: tests/fixtures/CharacterSuite.lua.
-- Geometry: the screen is 1440 x 900 UI units at UI scale 1; button centres are the ones measured by hand for
-- the original /bars/ page, so the generated guide can be compared with it.
local here = arg[0]:match("^(.*)/[^/]*$") or "."
local addonDir = here .. "/../CharacterSuite"
local out = arg[1] or (here .. "/../../tests/fixtures/CharacterSuite.lua")

local chat, events, popups, shots = {}, {}, {}, 0
local SCREEN_W, SCREEN_H = 1440, 900

-- the stub -----------------------------------------------------------------------------------------------------
_G.DEFAULT_CHAT_FRAME = { AddMessage = function(_, m) table.insert(chat, m) end }
_G.SlashCmdList = {}
_G.StaticPopupDialogs = {}
_G.StaticPopup_Show = function(name) table.insert(popups, name) end
_G.C_Timer = { After = function(_, fn) fn() end }
_G.unpack = unpack or table.unpack
local frames = {}
_G.CreateFrame = function()
  local f = { events = {} }
  function f:RegisterEvent(e)
    if e == "NOT_AN_EVENT" then error("unknown event") end
    self.events[e] = true
  end
  function f:SetScript(_, fn) self.onEvent = fn end
  table.insert(frames, f)
  return f
end
local function fire(e, ...)
  for _, f in ipairs(frames) do if f.events[e] and f.onEvent then f.onEvent(f, e, ...) end end
end
_G.Screenshot = function() shots = shots + 1; fire("SCREENSHOT_SUCCEEDED") end
_G.time = os.time
_G.date = os.date
_G.UnitName = function(u) if u == "player" then return "Rambleon" elseif u == "pet" then return "Scarletfire" end end
_G.UnitFullName = function(u) if u == "player" then return "Rambleon", "Birdsong" end end
_G.GetRealmName = function() return "Classic Beta PvE" end
_G.GetNormalizedRealmName = function() return "ClassicBetaPvE" end
_G.UnitRace = function() return "Night Elf", "NightElf" end
_G.UnitClass = function() return "Hunter", "HUNTER" end
_G.UnitFactionGroup = function() return "Alliance" end
_G.UnitSex = function() return 2 end
_G.UnitLevel = function() return 30 end
_G.UnitGUID = function() return "Player-6113-0A1B2C3D" end
_G.UnitExists = function(u) return u == "pet" end
_G.GetPhysicalScreenSize = function() return 2880, 1800 end
_G.UIParent = { GetWidth = function() return SCREEN_W end, GetHeight = function() return SCREEN_H end,
                GetEffectiveScale = function() return 1 end }

-- Rambleon's layout: spells, ranks, bindings, centres (x, y from the top-left) and size in UI units.
local spells, nextId = {}, 1000
local actions, bindings = {}, {}
local function spell(name, rank)
  nextId = nextId + 1
  spells[nextId] = { name = name, rank = rank, desc = name .. " does what it says." }
  return nextId
end
local function button(frameName, cx, cy, size, scale)
  scale = scale or 1
  local w = size / scale
  local b = { IsVisible = function() return true end,
              GetEffectiveScale = function() return scale end,
              GetRect = function() return cx / scale - w / 2, (SCREEN_H - cy) / scale - w / 2, w, w end }
  _G[frameName] = b
  return b
end
local function bar(frameName, bind, slot0, x, y, size, list, keys)
  for k, entry in ipairs(list) do
    local b = button(frameName .. k, x(k - 1), y, size)
    b.action = slot0 + k
    if entry then actions[b.action] = spell(entry[1], entry[2]) end
    if keys[k] then bindings[bind .. k] = keys[k] end
  end
end
local NUM = { "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=" }
local SHIFT = {}
for i = 1, 10 do SHIFT[i] = "SHIFT-" .. NUM[i] end

bar("ActionButton", "ACTIONBUTTON", 0, function(k) return 331.6 + 31.9 * k end, 803, 30, {
  { "Attack" }, { "Raptor Strike", "Rank 4" }, { "Wing Clip", "Rank 1" }, { "Mongoose Bite", "Rank 1" },
  { "Hunter's Mark", "Rank 2" }, { "Arcane Shot", "Rank 4" }, { "Aimed Shot", "Rank 2" }, { "Serpent Sting", "Rank 4" },
  { "Scorpid Sting", "Rank 2" }, { "Concussive Shot" }, { "Multi-Shot", "Rank 2" }, { "Rapid Fire" },
}, NUM)
bar("MultiBarBottomLeftButton", "MULTIACTIONBAR1BUTTON", 60, function(k) return 348.7 + 31.85 * k end, 755, 30, {
  { "Freezing Trap", "Rank 1" }, { "Frost Trap", "Rank 1" }, { "Immolation Trap", "Rank 2" }, { "Aspect of the Hawk", "Rank 3" },
  { "Aspect of the Monkey" }, { "Aspect of the Cheetah" }, { "Mend Pet", "Rank 3" }, { "Disengage", "Rank 1" },
  { "Distracting Shot", "Rank 2" }, { "Scare Beast", "Rank 1" }, { "Shadowmeld", "Racial" }, { "Elune's Light", "Racial" },
}, SHIFT)
bar("MultiBarBottomRightButton", "MULTIACTIONBAR2BUTTON", 48, function(k) return 744.5 + 32.05 * k end, 755, 30, {
  { "Call Pet" }, { "Dismiss Pet" }, { "Revive Pet" }, { "Feed Pet" }, { "Tame Beast" }, { "Eagle Eye" },
  { "Eyes of the Beast" }, { "Track Beasts" }, { "Track Humanoids" }, { "Track Undead" }, { "Track Hidden" }, { "Track Elementals" },
}, {})
-- Action Bar 4 exists but is empty and hidden: nothing of it may be recorded.
for k = 1, 12 do _G["MultiBarRightButton" .. k] = { IsVisible = function() return false end, action = 24 + k } end

-- Pet bar: ten buttons, three of them empty, drawn at 0.8 effective scale (rectangles must still come out right).
local PET = { { "PET_ACTION_ATTACK", true }, { "PET_ACTION_FOLLOW", true }, { "PET_ACTION_MOVE_TO", true }, { "Growl" },
              false, false, false, { "PET_MODE_ASSIST", true }, { "PET_MODE_DEFENSIVE", true }, { "PET_MODE_PASSIVE", true } }
_G.PET_ACTION_ATTACK, _G.PET_ACTION_FOLLOW, _G.PET_ACTION_MOVE_TO = "Attack", "Follow", "Move To"
_G.PET_MODE_ASSIST, _G.PET_MODE_DEFENSIVE, _G.PET_MODE_PASSIVE = "Assist", "Defensive", "Passive"
local PETX = { 348, 369, 391, 413, 435, 457, 479, 501, 523, 544 }
local PETKEY = { "CTRL-1", "CTRL-2", "CTRL-3", "CTRL-4", nil, nil, nil, "CTRL-8", "CTRL-9", "CTRL-0" }
for i = 1, 10 do
  button("PetActionButton" .. i, PETX[i], 725, 20, 0.8)
  if PETKEY[i] then bindings["BONUSACTIONBUTTON" .. i] = PETKEY[i] end
end
_G.GetPetActionInfo = function(i)
  local p = PET[i]
  if not p then return nil end
  if p[2] then return p[1], p[1] .. "_TEXTURE", true, i == 9, false, false, nil end
  return p[1], 132270, false, false, true, true, 2649
end
_G.GetNumShapeshiftForms = function() return 0 end

_G.HasAction = function(slot) return actions[slot] ~= nil end
_G.GetActionInfo = function(slot) return "spell", actions[slot], "spell" end
_G.GetActionTexture = function(slot) return 130000 + slot end
_G.GetActionText = function() return nil end
_G.GetBindingKey = function(cmd) return bindings[cmd] end
_G.C_Spell = {
  GetSpellName = function(id) return spells[id] and spells[id].name end,
  GetSpellSubtext = function(id) return spells[id] and spells[id].rank end,
  GetSpellDescription = function(id) return spells[id] and spells[id].desc end,
}

-- run ----------------------------------------------------------------------------------------------------------
local ns = {}
for _, f in ipairs({ "Core.lua", "Bars.lua" }) do
  local chunk = assert(loadfile(addonDir .. "/" .. f))
  chunk("CharacterSuite", ns)
end

local function eq(a, b, msg) if a ~= b then error((msg or "") .. ": expected " .. tostring(b) .. ", got " .. tostring(a), 2) end end

fire("ADDON_LOADED", "CharacterSuite")
fire("PLAYER_LOGIN")
eq(#chat, 1, "one line at login")
SlashCmdList.CHARACTERSUITE("bars")
eq(shots, 1, "one screenshot")
eq(#popups, 1, "the reload popup is offered once")
eq(popups[1], "CHARACTERSUITE_RELOAD", "popup name")
assert(chat[2]:find("captured 43 buttons on 4 bars", 1, true), "chat line: " .. tostring(chat[2]))

local snap = CharacterSuiteDB.bars[1]
eq(#CharacterSuiteDB.bars, 1, "one snapshot")
eq(snap.character.displayName, "Rambleon Birdsong", "display name from the Forever name shape")
eq(snap.character.pet, "Scarletfire", "pet")
eq(snap.character.level, 30, "level")
eq(#snap.bars, 4, "main, bar 2, bar 3, pet; the hidden bar 4 is left out")
eq(snap.bars[1].id, "main", "main first")
eq(snap.bars[1].buttons[2].name, "Raptor Strike", "spell name")
eq(snap.bars[1].buttons[2].rank, "Rank 4", "rank")
eq(snap.bars[1].buttons[12].key1, "=", "binding")
eq(snap.bars[2].buttons[11].key1, nil, "Shadowmeld is not bound")
eq(snap.bars[3].buttons[1].key1, nil, "the side bar is click only")
local pet = snap.bars[4]
eq(pet.id, "pet", "pet bar")
eq(#pet.buttons, 7, "three empty pet slots skipped")
eq(pet.buttons[1].name, "Attack", "pet token resolved through its global")
eq(pet.buttons[5].index, 8, "slot index kept across the gap")
eq(pet.buttons[6].active, true, "active pet mode")
local r = pet.buttons[1].rect
eq(math.floor(r.w * r.s + 0.5), 20, "pet button is 20 units on screen at 0.8 scale")
eq(math.floor((r.l + r.w / 2) * r.s + 0.5), 348, "pet button centre x")
eq(math.floor(SCREEN_H - (r.b + r.h / 2) * r.s + 0.5), 725, "pet button centre y from the top")

-- the snapshot list never grows past BARS_KEEP
for _ = 1, 7 do ns.TakeBarsSnapshot() end
eq(#CharacterSuiteDB.bars, ns.BARS_KEEP, "snapshots are capped")
for i = 1, #CharacterSuiteDB.bars - 1 do table.remove(CharacterSuiteDB.bars, 1) end
-- a stable stamp for the fixture: the matching screenshot is WoWScrnShot_101626_214500.jpg
CharacterSuiteDB.bars[1].takenAt = 1792201500
CharacterSuiteDB.bars[1].localStamp = "101626_214500"

-- everything stored must be SavedVariables-safe
local function check(v, path)
  local t = type(v)
  if t == "table" then for k, x in pairs(v) do
    assert(type(k) == "string" or type(k) == "number", path .. ": bad key")
    check(x, path .. "." .. tostring(k))
  end
  else assert(t == "string" or t == "number" or t == "boolean", path .. ": " .. t) end
end
check(CharacterSuiteDB, "CharacterSuiteDB")

-- Blizzard's SavedVariables format, positional entries with their "-- [n]" comments --------------------------
local function ser(v, indent)
  if type(v) == "string" then return string.format("%q", v):gsub("\\\n", "\\n") end
  if type(v) ~= "table" then return tostring(v) end
  local lines, pad = { "{" }, string.rep("\t", indent)
  local n = #v
  for i = 1, n do table.insert(lines, pad .. "\t" .. ser(v[i], indent + 1) .. ", -- [" .. i .. "]") end
  local keys = {}
  for k in pairs(v) do if not (type(k) == "number" and k >= 1 and k <= n) then table.insert(keys, k) end end
  table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
  for _, k in ipairs(keys) do
    local key = type(k) == "string" and string.format("[%q]", k) or ("[" .. k .. "]")
    table.insert(lines, pad .. "\t" .. key .. " = " .. ser(v[k], indent + 1) .. ",")
  end
  table.insert(lines, pad .. "}")
  return table.concat(lines, "\n")
end
local fh = assert(io.open(out, "w"))
fh:write("\nCharacterSuiteDB = " .. ser(CharacterSuiteDB, 0) .. "\n")
fh:close()
print("ok: /suite bars on the stub, fixture written to " .. out)
