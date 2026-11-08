// These checks run only when the player presses the Custom Task check button.
// A zero check timer prevents background polling.

const QUEST_CHECK_CURIOS = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')

const FILLED_SPELLBOOKS = [
  'irons_spellbooks:blaze_spell_book',
  'irons_spellbooks:copper_spell_book',
  'irons_spellbooks:cursed_doll_spell_book',
  'irons_spellbooks:diamond_spell_book',
  'irons_spellbooks:dragonskin_spell_book',
  'irons_spellbooks:druidic_spell_book',
  'irons_spellbooks:evoker_spell_book',
  'irons_spellbooks:gold_spell_book',
  'irons_spellbooks:ice_spell_book',
  'irons_spellbooks:iron_spell_book',
  'irons_spellbooks:legendary_spell_book',
  'irons_spellbooks:necronomicon_spell_book',
  'irons_spellbooks:netherite_spell_book',
  'irons_spellbooks:rotten_spell_book',
  'irons_spellbooks:villager_spell_book',
  'irons_spellbooks:wimpy_spell_book'
]

const SPECIAL_SPELLBOOKS = [
  'irons_spellbooks:rotten_spell_book',
  'irons_spellbooks:blaze_spell_book',
  'irons_spellbooks:dragonskin_spell_book',
  'irons_spellbooks:druidic_spell_book',
  'irons_spellbooks:villager_spell_book',
  'irons_spellbooks:evoker_spell_book',
  'irons_spellbooks:necronomicon_spell_book',
  'irons_spellbooks:cursed_doll_spell_book',
  'irons_spellbooks:ice_spell_book'
]

const WANDS_AND_STAFFS = [
  'irons_spellbooks:staff_of_the_nines',
  'irons_spellbooks:blood_staff',
  'irons_spellbooks:pyrium_staff',
  'irons_spellbooks:graybeard_staff',
  'irons_spellbooks:ice_staff',
  'irons_spellbooks:artificer_cane',
  'irons_spellbooks:lightning_rod',
  'irons_spellbooks:hither_thither_wand'
]

const VANILLA_ARMOR = [
  'minecraft:leather_helmet', 'minecraft:leather_chestplate', 'minecraft:leather_leggings', 'minecraft:leather_boots',
  'minecraft:chainmail_helmet', 'minecraft:chainmail_chestplate', 'minecraft:chainmail_leggings', 'minecraft:chainmail_boots',
  'minecraft:iron_helmet', 'minecraft:iron_chestplate', 'minecraft:iron_leggings', 'minecraft:iron_boots',
  'minecraft:golden_helmet', 'minecraft:golden_chestplate', 'minecraft:golden_leggings', 'minecraft:golden_boots',
  'minecraft:diamond_helmet', 'minecraft:diamond_chestplate', 'minecraft:diamond_leggings', 'minecraft:diamond_boots',
  'minecraft:netherite_helmet', 'minecraft:netherite_chestplate', 'minecraft:netherite_leggings', 'minecraft:netherite_boots'
]

function inventoryStacks(player) {
  let stacks = []
  for (let slot = 0; slot < player.inventory.containerSize; slot++) {
    addQuestStack(stacks, player.inventory.getItem(slot))
  }
  // Worn items count too: a spell book usually sits in its Curios slot.
  try {
    let curios = QUEST_CHECK_CURIOS.getCuriosInventory(player).resolve()
    if (curios.isPresent()) {
      let worn = curios.get().getEquippedCurios()
      for (let slot = 0; slot < worn.getSlots(); slot++) {
        addQuestStack(stacks, worn.getStackInSlot(slot))
      }
    }
  } catch (err) {
    console.error('quest check could not read Curios: ' + err)
  }
  return stacks
}

function addQuestStack(stacks, stack) {
  if (!stack.empty) {
    stacks.push({
      id: String(stack.id),
      nbt: stack.nbt == null ? '' : String(stack.nbt)
    })
  }
}

function hasAll(text, needles) {
  for (let needle of needles) {
    if (text.indexOf(needle) < 0) return false
  }
  return true
}

function registerClickCheck(taskId, predicate) {
  FTBQuestsEvents.customTask(taskId, event => {
    event.maxProgress = 1
    event.setCheckTimer(0)
    // Off by default in FTB Quests. Without it, clicking the task does nothing and
    // a zero timer means the check never runs, so the quest can't complete.
    event.setEnableButton(true)
    event.setCheck((task, player) => {
      if (predicate(inventoryStacks(player))) {
        task.setProgress(1)
      }
    })
  })
}

registerClickCheck('1A10600000000004', stacks =>
  stacks.some(stack => stack.nbt.indexOf('gems:[{') >= 0)
)

registerClickCheck('1A10600000000006', stacks =>
  stacks.some(stack => stack.nbt.indexOf('affixes:{') >= 0)
)

registerClickCheck('1A20600000000004', stacks =>
  stacks.some(stack =>
    FILLED_SPELLBOOKS.indexOf(stack.id) >= 0 &&
    stack.nbt.indexOf('irons_spellbooks:spell_container') >= 0 &&
    stack.nbt.indexOf('data:[{') >= 0
  )
)

registerClickCheck('2C00600000000002', stacks =>
  stacks.some(stack => {
    let persistent = stack.nbt.match(/tinkerslevellingaddon:level["']?:([0-9]+)/)
    let persistentLevel = persistent == null ? -1 : Number(persistent[1])
    let improvable = stack.nbt.indexOf('tinkerslevellingaddon:improvable') >= 0 &&
      /level:7/.test(stack.nbt)
    return (persistentLevel >= 6 && persistentLevel <= 15) || improvable
  })
)

registerClickCheck('2C00600000000003', stacks =>
  stacks.some(stack =>
    hasAll(stack.nbt, [
      'tconstruct:diamond',
      'tconstruct:emerald',
      'tconstruct:netherite',
      'tconstruct:protection'
    ])
  )
)

registerClickCheck('2C00600000000004', stacks =>
  stacks.some(stack =>
    stack.id.indexOf('tconstruct:') === 0 &&
    stack.nbt.indexOf('tconstruct:unbreakable') >= 0
  )
)

registerClickCheck('2C10600000000004', stacks =>
  stacks.some(stack =>
    stack.id === 'apotheosis:gem' &&
    stack.nbt.indexOf('rarity:"apotheosis:ancient"') >= 0
  )
)

registerClickCheck('2C10600000000005', stacks =>
  stacks.some(stack =>
    VANILLA_ARMOR.indexOf(stack.id) >= 0 &&
    stack.nbt.indexOf('rarity:"apotheosis:mythic"') >= 0
  )
)

registerClickCheck('2C20600000000002', stacks =>
  stacks.some(stack => SPECIAL_SPELLBOOKS.indexOf(stack.id) >= 0)
)

registerClickCheck('2C20600000000003', stacks =>
  stacks.some(stack => WANDS_AND_STAFFS.indexOf(stack.id) >= 0)
)

function hasPickaxeMaterial(stacks, material) {
  return stacks.some(stack =>
    stack.id === 'tconstruct:pickaxe' &&
    stack.nbt.indexOf(material) >= 0
  )
}

registerClickCheck('3D00600000000008', stacks => hasPickaxeMaterial(stacks, 'ticex:wyvern'))
registerClickCheck('3D0060000000000D', stacks => hasPickaxeMaterial(stacks, 'ticex:draconic'))
registerClickCheck('3D00600000000013', stacks => hasPickaxeMaterial(stacks, 'ticex:chaotic'))
