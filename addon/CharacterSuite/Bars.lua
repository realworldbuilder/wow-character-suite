-- /suite bars: a snapshot of every visible, filled action button plus a screenshot of the screen.
-- The web page (make/) cuts the icons out of the screenshot and places a hotspot on each button from the
-- rectangles recorded here, so nothing has to be measured by hand.
local _, ns = ...

ns.BARS_KEEP = 5      -- snapshots kept per character, newest last
ns.DESC_MAX = 400

-- Every bar the default UI can show. Frame names and binding commands of the 12.x UI.
ns.BAR_LAYOUT = {
  { id = "main",   title = "Action Bar 1", frame = "ActionButton",              bind = "ACTIONBUTTON",          count = 12 },
  { id = "bar2",   title = "Action Bar 2", frame = "MultiBarBottomLeftButton",  bind = "MULTIACTIONBAR1BUTTON", count = 12 },
  { id = "bar3",   title = "Action Bar 3", frame = "MultiBarBottomRightButton", bind = "MULTIACTIONBAR2BUTTON", count = 12 },
  { id = "bar4",   title = "Action Bar 4", frame = "MultiBarRightButton",       bind = "MULTIACTIONBAR3BUTTON", count = 12 },
  { id = "bar5",   title = "Action Bar 5", frame = "MultiBarLeftButton",        bind = "MULTIACTIONBAR4BUTTON", count = 12 },
  { id = "bar6",   title = "Action Bar 6", frame = "MultiBar5Button",           bind = "MULTIACTIONBAR5BUTTON", count = 12 },
  { id = "bar7",   title = "Action Bar 7", frame = "MultiBar6Button",           bind = "MULTIACTIONBAR6BUTTON", count = 12 },
  { id = "bar8",   title = "Action Bar 8", frame = "MultiBar7Button",           bind = "MULTIACTIONBAR7BUTTON", count = 12 },
  { id = "pet",    title = "Pet bar",      frame = "PetActionButton",           bind = "BONUSACTIONBUTTON",     count = 10, kind = "pet" },
  { id = "stance", title = "Stance bar",   frame = "StanceButton",              bind = "SHAPESHIFTBUTTON",      count = 10, kind = "stance" },
}

local function spellName(id)
  if C_Spell and C_Spell.GetSpellName then return ns.SafeCall(C_Spell.GetSpellName, id) end
  return (ns.SafeCall(GetSpellInfo, id))
end

local function spellRank(id)
  if C_Spell and C_Spell.GetSpellSubtext then return ns.SafeCall(C_Spell.GetSpellSubtext, id) end
  return ns.SafeCall(GetSpellSubtext, id)
end

local function spellDescription(id)
  if C_Spell and C_Spell.GetSpellDescription then return ns.SafeCall(C_Spell.GetSpellDescription, id) end
  return ns.SafeCall(GetSpellDescription, id)
end

local function itemName(id)
  if C_Item and C_Item.GetItemNameByID then
    local n = ns.SafeCall(C_Item.GetItemNameByID, id)
    if n then return n end
  end
  return (ns.SafeCall(GetItemInfo, id))
end

-- The button's rectangle in UI units, with the scale that turns them into UIParent's.
local function rect(btn)
  local l, b, w, h = ns.SafeCall(btn.GetRect, btn)
  if type(l) ~= "number" or type(w) ~= "number" or w <= 0 then return nil end
  return { l = ns.Round(l, 2), b = ns.Round(b, 2), w = ns.Round(w, 2), h = ns.Round(h, 2),
           s = ns.Round(ns.SafeCall(btn.GetEffectiveScale, btn) or 1, 4) }
end

local function bindings(cmd)
  local k1, k2 = ns.SafeCall(GetBindingKey, cmd)
  return ns.CleanString(k1), ns.CleanString(k2)
end

local function actionSlot(btn)
  local slot = btn.action
  if type(slot) ~= "number" and btn.GetAttribute then slot = ns.SafeCall(btn.GetAttribute, btn, "action") end
  if type(slot) ~= "number" or slot <= 0 then return nil end
  return slot
end

local function readAction(btn)
  local slot = actionSlot(btn)
  if not slot or not ns.SafeCall(HasAction, slot) then return nil end
  local kind, id, subType = ns.SafeCall(GetActionInfo, slot)
  local a = { slot = slot, kind = ns.CleanString(kind) or "unknown", id = ns.Clean(id), subType = ns.CleanString(subType) }
  if a.kind == "spell" and a.id then
    a.name = ns.CleanString(spellName(a.id))
    a.rank = ns.CleanString(spellRank(a.id))
    a.description = ns.CleanString(spellDescription(a.id), ns.DESC_MAX)
  elseif a.kind == "item" and a.id then
    a.name = ns.CleanString(itemName(a.id))
  elseif a.kind == "macro" and a.id then
    a.name = ns.CleanString((ns.SafeCall(GetMacroInfo, a.id)))
  end
  a.name = a.name or ns.CleanString(ns.SafeCall(GetActionText, slot))
  a.icon = ns.Clean(ns.SafeCall(GetActionTexture, slot))
  return a
end

local function readPet(i)
  local name, texture, isToken, isActive, _, _, spellID = ns.SafeCall(GetPetActionInfo, i)
  if not name then return nil end
  local a = { slot = i, kind = "pet", id = ns.Clean(spellID), active = ns.Clean(isActive) and true or nil }
  if isToken then
    a.token = ns.CleanString(name)
    name = _G[name] or name
    texture = _G[texture] or texture
  end
  a.name = ns.CleanString(name)
  a.icon = ns.Clean(texture)
  if a.id then a.rank = ns.CleanString(spellRank(a.id)); a.description = ns.CleanString(spellDescription(a.id), ns.DESC_MAX) end
  return a
end

local function readStance(i)
  local icon, active, _, spellID = ns.SafeCall(GetShapeshiftFormInfo, i)
  if not icon and not spellID then return nil end
  local a = { slot = i, kind = "stance", id = ns.Clean(spellID), icon = ns.Clean(icon), active = ns.Clean(active) and true or nil }
  if a.id then a.name = ns.CleanString(spellName(a.id)); a.rank = ns.CleanString(spellRank(a.id)) end
  return a
end

function ns.CaptureBars()
  local bars = {}
  local stances = ns.SafeCall(GetNumShapeshiftForms) or 0
  for _, layout in ipairs(ns.BAR_LAYOUT) do
    local buttons = {}
    for i = 1, layout.count do
      local btn = _G[layout.frame .. i]
      if btn and ns.SafeCall(btn.IsVisible, btn) then
        local a
        if layout.kind == "pet" then a = readPet(i)
        elseif layout.kind == "stance" then a = (i <= stances) and readStance(i) or nil
        else a = readAction(btn) end
        local r = a and rect(btn)
        if a and r then
          a.index = i
          a.rect = r
          a.key1, a.key2 = bindings(layout.bind .. i)
          table.insert(buttons, a)
        end
      end
    end
    if #buttons > 0 then table.insert(bars, { id = layout.id, title = layout.title, buttons = buttons }) end
  end
  return bars
end

function ns.CaptureScreen()
  local s = { uiWidth = ns.Round(ns.SafeCall(UIParent.GetWidth, UIParent), 2),
              uiHeight = ns.Round(ns.SafeCall(UIParent.GetHeight, UIParent), 2),
              uiScale = ns.Round(ns.SafeCall(UIParent.GetEffectiveScale, UIParent) or 1, 4) }
  local pw, ph = ns.SafeCall(GetPhysicalScreenSize)
  s.physicalWidth, s.physicalHeight = ns.Clean(pw), ns.Clean(ph)
  return s
end

function ns.TakeBarsSnapshot()
  local snap = {
    takenAt = time(),
    -- Screenshot file names are WoWScrnShot_MMDDYY_HHMMSS in local time; the page matches on this.
    localStamp = date("%m%d%y_%H%M%S"),
    character = ns.CaptureCharacter(),
    screen = ns.CaptureScreen(),
    bars = ns.CaptureBars(),
  }
  local list = ns.db.bars
  table.insert(list, snap)
  while #list > ns.BARS_KEEP do table.remove(list, 1) end
  return snap
end

-- The command ---------------------------------------------------------------------------------------------------

local pending = false

local function offerReload()
  if not pending then return end
  pending = false
  if StaticPopup_Show then StaticPopup_Show("CHARACTERSUITE_RELOAD") end
end

StaticPopupDialogs = StaticPopupDialogs or {}
StaticPopupDialogs["CHARACTERSUITE_RELOAD"] = {
  text = "Your action bars are captured, with a screenshot.\n\nReload now so WoW writes them to disk? Logging out does the same.",
  button1 = "RELOAD",
  button2 = "LATER",
  OnAccept = function()
    if C_UI and C_UI.Reload then C_UI.Reload() elseif ReloadUI then ReloadUI() end
  end,
  timeout = 0, whileDead = true, hideOnEscape = true, preferredIndex = 3,
}

ns.On("SCREENSHOT_SUCCEEDED", function()
  if C_Timer and C_Timer.After then C_Timer.After(0.3, offerReload) else offerReload() end
end)
ns.On("SCREENSHOT_FAILED", function()
  if not pending then return end
  ns.Print("could not take the screenshot. Take one yourself (Print Screen) with your bars showing.")
  offerReload()
end)

table.insert(ns.COMMANDS, { name = "bars", help = "capture your action bars and take a screenshot for the Bar Guide", run = function()
  if not ns.db then ns.InitDB() end
  local snap = ns.TakeBarsSnapshot()
  local n = 0
  for _, bar in ipairs(snap.bars) do n = n + #bar.buttons end
  ns.Print(("captured %d buttons on %d bars. After the reload, drop CharacterSuite.lua and the screenshot on %s"):format(n, #snap.bars, ns.SITE))
  pending = true
  Screenshot()
  -- Some clients never fire SCREENSHOT_SUCCEEDED: offer the reload anyway.
  if C_Timer and C_Timer.After then C_Timer.After(3, offerReload) end
end })
