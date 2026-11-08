// Saint's Dragons stay wild until the Draconic Age. Taming is weaken-then-feed,
// so this blocks the feed on an unowned dragon. The food items themselves are
// untouched - they are raw beef, cod and chorus fruit, which the pack cannot
// afford to restrict.
//
// Registered per food item, so Java filters on the item before any JavaScript
// runs. Riding, gear and every other interaction with a dragon never reaches
// this file. The list is the union of every saintsdragons:foods/* tag; if the
// mod adds a new dragon with a new diet, add its food here or the gate leaks.
//
// Rhino here throws "redeclaration of var X" when a const inside a named
// function body is evaluated twice, so everything below the top level uses var.
const DRAGON_GATE_STAGE_UTIL = Java.loadClass('com.decursioteam.decursio_stages.utils.StageUtil')
const DRAGON_GATE_STAGE = 'draconic_age'

const DRAGON_GATE_FOODS = [
  'minecraft:beef',
  'minecraft:chicken',
  'minecraft:chorus_fruit',
  'minecraft:cod',
  'minecraft:mutton',
  'minecraft:porkchop',
  'minecraft:pufferfish',
  'minecraft:salmon',
  'minecraft:tropical_fish',
  'saintsdragons:hearty_dragon_meal'
]

function dragonGateAllows(player, target) {
  try {
    if (DRAGON_GATE_STAGE_UTIL.hasStage(player, DRAGON_GATE_STAGE)) {
      return true
    }

    // A dragon already bonded to someone stays feedable by its owner.
    var tag = target.nbt

    return !!(tag && (tag.contains('Owner') || tag.contains('OwnerUUID')))
  } catch (err) {
    // Fail closed: a broken check must not hand out free dragons.
    console.error('dragon taming gate check failed: ' + err)
    return false
  }
}

DRAGON_GATE_FOODS.forEach(food => {
  ItemEvents.entityInteracted(food, event => {
    var player = event.player
    var target = event.target

    if (!player || !target) {
      return
    }

    if (String(target.type).indexOf('saintsdragons:') !== 0) {
      return
    }

    if (dragonGateAllows(player, target)) {
      return
    }

    event.cancel()
    player.tell('This dragon will not submit to you before the Draconic Age.')
  })
})
