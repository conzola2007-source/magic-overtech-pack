// Soulbound for any item (Moe, 2026-11-04). A soft keep-inventory: Tinkers has
// its own Soulbound modifier, but only for Tinkers tools. This adds the same
// idea for everything else (boss weapons, vanilla gear, modded armour) and
// nothing more: no other Tinkers modifiers become possible on non-Tinkers items.
//
// Anvil: any single (non-stackable) item + 1 Echo Shard -> the same item marked
// Soulbound (NBT MOSoulbound + a lore line). 1 level, uses 1 shard.
// Death: Soulbound stacks are pulled out of the death drops, kept in the
// player's KubeJS data (PlayerPersisted key), and given back
// on respawn. Covers the normal inventory, armour and offhand.
// Curios slots (rings, belts, worn backpacks): Curios' DropRulesEvent gets an
// ALWAYS_KEEP override for Soulbound stacks, so they just stay in their slot.
// Backpacks: see the backpack rule above the death handler (keep the gear,
// lose the loot).
// Gravestones (2026-11-17): GraveStone (henkelmax) collects the drops at LOWEST
// priority, after this handler, so Soulbound stacks are already gone and never
// land in the grave. Loot pulled out of a Soulbound backpack is added to the
// drops so it goes into the grave too. Soulbound items come back into the slot
// they were in (recorded on LivingDeathEvent, read nothing else).
//
// Cost: anvil event fires only when an anvil's slots change; drops only on a
// player death; respawn only on respawn. No tick, no polling.
// Both death events fire server side only, so no level() check (level() threw
// in dragon_mount_gate.js). Startup script because raw ForgeEvents only live here in KubeJS 6: restart
// the game after editing.
const SB_TAG = 'MOSoulbound'
const SB_KEY = 'MOSoulboundStash'
const SB_ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
const SB_CompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const SB_ListTag = Java.loadClass('net.minecraft.nbt.ListTag')
const SB_StringTag = Java.loadClass('net.minecraft.nbt.StringTag')
const SB_ItemsReg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const SB_ItemEntity = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
const SB_SLOT = 'MOSlot'
// Where each Soulbound item sat, written to the player's own data on death and
// read (then removed) by the drops handler right after. Not keyed by UUID:
// player.getUUID() doesn't exist through KubeJS and threw on every death from
// 2026-11-17 to 11-18, which killed the whole stash, so Soulbound items fell
// into the grave. Not under PlayerPersisted, so it never survives respawn.
const SB_SLOTS_KEY = 'MOSoulboundSlots'

// getNbt(), not getTag()/hasTag(): KubeJS's ItemStackMixin remaps vanilla
// getTag -> getNbt, hasTag -> hasNBT, setTag -> setNbt for scripts, so getTag()
// doesn't exist here and threw on every stack (anvil gave no result, Soulbound
// never applied). Fixed 2026-11-14, checked in kubejs-forge-2001.6.5-build.26.
function sbIsSoulbound(stack) {
  if (!stack || stack.isEmpty()) return false
  var nbt = stack.getNbt()
  return nbt != null && nbt.getBoolean(SB_TAG) == true
}

const SB_CurioDropRule = Java.loadClass('top.theillusivec4.curios.api.type.capability.ICurio$DropRule')

ForgeEvents.onEvent('top.theillusivec4.curios.api.event.DropRulesEvent', event => {
  try {
    // Curios runs this later, outside this try. If it throws, the whole inventory
    // is lost on death, so it has to catch its own errors.
    event.addOverride(stack => {
      try {
        return sbIsSoulbound(stack)
      } catch (err) {
        console.error('soulbound curios check failed: ' + err)
        return false
      }
    }, SB_CurioDropRule.ALWAYS_KEEP)
  } catch (err) {
    console.error('soulbound curios rule failed: ' + err)
  }
})

ForgeEvents.onEvent('net.minecraftforge.event.AnvilUpdateEvent', event => {
  try {
    var right = event.getRight()
    if (!right || right.isEmpty()) return
    if (String(SB_ItemsReg.ITEM.getKey(right.getItem())) !== 'minecraft:echo_shard') return
    var left = event.getLeft()
    if (!left || left.isEmpty()) return
    if (left.getMaxStackSize() !== 1) return
    if (sbIsSoulbound(left)) return

    var out = left.copy()
    out.getOrCreateTag().putBoolean(SB_TAG, true)
    var display = out.getOrCreateTagElement('display')
    var lore = display.contains('Lore', 9) ? display.getList('Lore', 8) : new SB_ListTag()
    lore.add(SB_StringTag.valueOf('{"text":"Soulbound","color":"light_purple","italic":false}'))
    display.put('Lore', lore)

    event.setOutput(out)
    event.setCost(1)
    event.setMaterialCost(1)
  } catch (err) {
    console.error('soulbound anvil failed: ' + err)
  }
})

// Backpack rule (Moe: "you shouldn't lose your hard-earned items, but you
// should lose your loot"). Soulbound items always come back, wherever they are.
// - Soulbound backpack: comes back, but everything inside that is NOT
//   Soulbound is pulled out and dropped at the death spot.
// - Normal backpack: drops whole, but Soulbound items inside are pulled out
//   and come back.
// Nested backpacks follow the same rule (depth capped at 4).
const SB_BackpackCap = Java.loadClass('net.p3pp3rf1y.sophisticatedbackpacks.api.CapabilityBackpackWrapper')
const SB_CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')

function sbBackpackInv(stack) {
  try {
    var w = stack.getCapability(SB_BackpackCap.getCapabilityInstance()).resolve()
    return w.isPresent() ? w.get().getInventoryHandler() : null
  } catch (err) {
    return null
  }
}

// bound: whether this backpack itself comes back with the player.
// Pulls out what must change hands: Soulbound items from an unbound backpack
// go to stash, loot from a bound backpack goes to loot.
function sbSortBackpack(stack, bound, stash, loot, depth) {
  if (depth > 4) return
  var inv = sbBackpackInv(stack)
  if (!inv) return
  for (var i = 0; i < inv.getSlots(); i++) {
    var inside = inv.getStackInSlot(i)
    if (inside.isEmpty()) continue
    var sb = sbIsSoulbound(inside)
    if (sb === bound) {
      // stays where it is; if it's a backpack, sort its contents too
      sbSortBackpack(inside, bound, stash, loot, depth + 1)
      continue
    }
    var guard = 0
    while (!inv.getStackInSlot(i).isEmpty() && guard++ < 64) {
      var out = inv.extractItem(i, inv.getStackInSlot(i).getCount(), false)
      if (out.isEmpty()) break
      // an item changing sides keeps its own rule for its own contents
      sbSortBackpack(out, sb, stash, loot, depth + 1)
      if (sb) stash.add(out.save(new SB_CompoundTag()))
      else loot.push(out)
    }
  }
}

// Only remembers where Soulbound items sit; changes nothing, so a revive mod
// cancelling the death later is harmless (the entry is replaced next death).
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDeathEvent', event => {
  var player = event.getEntity()
  if (!player || !player.isPlayer()) return
  try {
    var inv = player.getInventory()
    var list = new SB_ListTag()
    for (var i = 0; i < inv.getContainerSize(); i++) {
      var st = inv.getItem(i)
      if (!sbIsSoulbound(st)) continue
      var entry = new SB_CompoundTag()
      entry.putInt('s', i)
      entry.put('i', st.save(new SB_CompoundTag()))
      list.add(entry)
    }
    player.getPersistentData().put(SB_SLOTS_KEY, list)
  } catch (err) {
    console.error('soulbound slot record failed: ' + err)
  }
})

function sbTakeSlot(slots, stack) {
  for (var i = 0; i < slots.length; i++) {
    if (SB_ItemStack.matches(slots[i].stack, stack)) {
      var s = slots[i].slot
      slots.splice(i, 1)
      return s
    }
  }
  return -1
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDropsEvent', event => {
  var player = event.getEntity()
  if (!player || !player.isPlayer()) return
  try {
    var data = player.getPersistentData()
    var persisted = data.getCompound('PlayerPersisted')
    var stash = persisted.contains(SB_KEY, 9) ? persisted.getList(SB_KEY, 10) : new SB_ListTag()
    var before = stash.size()
    var loot = []
    var slots = []
    if (data.contains(SB_SLOTS_KEY, 9)) {
      var rec = data.getList(SB_SLOTS_KEY, 10)
      for (var r = 0; r < rec.size(); r++) {
        var e = rec.getCompound(r)
        slots.push({ slot: e.getInt('s'), stack: SB_ItemStack.of(e.getCompound('i')) })
      }
      data.remove(SB_SLOTS_KEY)
    }

    // Backpacks still in Curios slots (Soulbound ones stay there).
    try {
      var cur = SB_CuriosApi.getCuriosInventory(player).resolve()
      if (cur.isPresent()) {
        var eq = cur.get().getEquippedCurios()
        for (var c = 0; c < eq.getSlots(); c++) {
          var worn = eq.getStackInSlot(c)
          if (!worn.isEmpty()) sbSortBackpack(worn, sbIsSoulbound(worn), stash, loot, 0)
        }
      }
    } catch (err) {
      console.error('soulbound curios backpack check failed: ' + err)
    }

    // Normal drops: Soulbound stacks are stashed, backpacks get sorted.
    var it = event.getDrops().iterator()
    while (it.hasNext()) {
      var drop = it.next()
      var stack = drop.getItem()
      var sb = sbIsSoulbound(stack)
      sbSortBackpack(stack, sb, stash, loot, 0)
      if (!sb) continue
      var saved = stack.save(new SB_CompoundTag())
      saved.putInt(SB_SLOT, sbTakeSlot(slots, stack))
      stash.add(saved)
      it.remove()
      drop.discard()
    }

    // Into the drops, so the gravestone takes it (it lands on the ground if no grave mod).
    for (var l = 0; l < loot.length; l++) {
      var ent = new SB_ItemEntity(player.getCommandSenderWorld(), player.getX(), player.getY(), player.getZ(), loot[l])
      ent.setDefaultPickUpDelay()
      event.getDrops().add(ent)
    }

    if (stash.size() === before) return
    persisted.put(SB_KEY, stash)
    data.put('PlayerPersisted', persisted)
  } catch (err) {
    console.error('soulbound death stash failed: ' + err)
  }
})

// Give-back. getPersistentData() here is KubeJS's own player data
// (KubeJSPersistentData in the player file), not Forge's, so Forge's
// PlayerPersisted copy-on-respawn never applied: the respawned player had no
// stash yet when PlayerRespawnEvent fired, nothing came back, and the stash
// just piled up (found 2026-11-18, seven items in Sido's file). Now the stash
// is read from the dead player in PlayerEvent.Clone and put straight into the
// new player's inventory, and cleared on both so it can't be given twice.
// Respawn and login give back anything still left (full inventory, or stashes
// saved before this fix).
function sbStashOf(player) {
  var persisted = player.getPersistentData().getCompound('PlayerPersisted')
  return persisted.contains(SB_KEY, 9) ? persisted.getList(SB_KEY, 10) : null
}
function sbClearStash(player) {
  var data = player.getPersistentData()
  var persisted = data.getCompound('PlayerPersisted')
  if (!persisted.contains(SB_KEY)) return
  persisted.remove(SB_KEY)
  data.put('PlayerPersisted', persisted)
}
function sbSetStash(player, list) {
  var data = player.getPersistentData()
  var persisted = data.getCompound('PlayerPersisted')
  persisted.put(SB_KEY, list)
  data.put('PlayerPersisted', persisted)
}
// Puts stash items into the player's inventory, old slot first. Returns what didn't fit.
function sbPlace(player, stash) {
  var inv = player.getInventory()
  var later = []
  for (var i = 0; i < stash.size(); i++) {
    var tag = stash.getCompound(i)
    var slot = tag.contains(SB_SLOT) ? tag.getInt(SB_SLOT) : -1
    var stack = SB_ItemStack.of(tag)
    if (stack.isEmpty()) continue
    if (slot >= 0 && slot < inv.getContainerSize() && inv.getItem(slot).isEmpty()) inv.setItem(slot, stack)
    else later.push(stack)
  }
  var left = new SB_ListTag()
  for (var j = 0; j < later.length; j++) {
    if (!inv.add(later[j])) left.add(later[j].save(new SB_CompoundTag()))
  }
  return left
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$Clone', event => {
  try {
    if (!event.isWasDeath()) return
    var oldP = event.getOriginal()
    var newP = event.getEntity()
    var stash = sbStashOf(oldP)
    if (!stash || stash.size() === 0) return
    var copy = stash.copy()
    sbClearStash(oldP)
    sbClearStash(newP)
    var left = sbPlace(newP, copy)
    if (left.size() > 0) sbSetStash(newP, left)
  } catch (err) {
    console.error('soulbound clone give-back failed: ' + err)
  }
})

function sbFlush(player) {
  var stash = sbStashOf(player)
  if (!stash || stash.size() === 0) return
  var copy = stash.copy()
  sbClearStash(player)
  var left = sbPlace(player, copy)
  for (var k = 0; k < left.size(); k++) player.drop(SB_ItemStack.of(left.getCompound(k)), false)
}

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerRespawnEvent', event => {
  try { sbFlush(event.getEntity()) } catch (err) { console.error('soulbound respawn give-back failed: ' + err) }
})
ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerLoggedInEvent', event => {
  try { sbFlush(event.getEntity()) } catch (err) { console.error('soulbound login give-back failed: ' + err) }
})
