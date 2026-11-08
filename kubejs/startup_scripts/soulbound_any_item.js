// Soulbound for any item (Moe, 2026-11-04). A soft keep-inventory: Tinkers has
// its own Soulbound modifier, but only for Tinkers tools. This adds the same
// idea for everything else (boss weapons, vanilla gear, modded armour) and
// nothing more: no other Tinkers modifiers become possible on non-Tinkers items.
//
// Anvil: any single (non-stackable) item + 1 Echo Shard -> the same item marked
// Soulbound (NBT MOSoulbound + a lore line). 1 level, uses 1 shard.
// Death: Soulbound stacks are pulled out of the death drops, kept in the
// player's PlayerPersisted data (Forge copies that across death), and given back
// on respawn. Covers the normal inventory, armour and offhand.
// Curios slots (rings, belts, worn backpacks): Curios' DropRulesEvent gets an
// ALWAYS_KEEP override for Soulbound stacks, so they just stay in their slot.
// Backpacks: see the backpack rule above the death handler (keep the gear,
// lose the loot).
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

// Not stack.hasTag(): KubeJS shadows it with hasTag(id), the item tag check, so
// the no-argument call throws. That killed death drops whenever a Curios slot was
// filled (fixed 2026-11-06).
function sbIsSoulbound(stack) {
  if (!stack || stack.isEmpty()) return false
  var nbt = stack.getTag()
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

ForgeEvents.onEvent('net.minecraftforge.event.entity.living.LivingDropsEvent', event => {
  var player = event.getEntity()
  if (!player || !player.isPlayer()) return
  try {
    var data = player.getPersistentData()
    var persisted = data.getCompound('PlayerPersisted')
    var stash = persisted.contains(SB_KEY, 9) ? persisted.getList(SB_KEY, 10) : new SB_ListTag()
    var before = stash.size()
    var loot = []

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
      stash.add(stack.save(new SB_CompoundTag()))
      it.remove()
      drop.discard()
    }

    for (var l = 0; l < loot.length; l++) player.drop(loot[l], true, false)

    if (stash.size() === before) return
    persisted.put(SB_KEY, stash)
    data.put('PlayerPersisted', persisted)
  } catch (err) {
    console.error('soulbound death stash failed: ' + err)
  }
})

ForgeEvents.onEvent('net.minecraftforge.event.entity.player.PlayerEvent$PlayerRespawnEvent', event => {
  var player = event.getEntity()
  try {
    var data = player.getPersistentData()
    var persisted = data.getCompound('PlayerPersisted')
    if (!persisted.contains(SB_KEY, 9)) return
    var stash = persisted.getList(SB_KEY, 10)
    for (var i = 0; i < stash.size(); i++) {
      var stack = SB_ItemStack.of(stash.getCompound(i))
      if (stack.isEmpty()) continue
      if (!player.getInventory().add(stack)) player.drop(stack, false)
    }
    persisted.remove(SB_KEY)
    data.put('PlayerPersisted', persisted)
  } catch (err) {
    console.error('soulbound respawn give-back failed: ' + err)
  }
})
