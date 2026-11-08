// The Capture Charm binds anything it is right-clicked on, which skips a
// dragon's whole weaken-and-feed taming fight. A mob that has taming of its own
// must actually be tamed before the charm will take it. Pigs and cows, which
// have no taming, are unaffected.
//
// Rhino here throws "redeclaration of var X" when a const inside a function body
// is evaluated more than once, so everything below the top level uses var.
const CHARM_ITEM = 'loyalcompanions:companion_charm'

const CHARM_TAMEABLE_TYPES = [
  'minecraft:wolf',
  'minecraft:cat',
  'minecraft:ocelot',
  'minecraft:parrot',
  'minecraft:horse',
  'minecraft:donkey',
  'minecraft:mule',
  'minecraft:skeleton_horse',
  'minecraft:zombie_horse',
  'minecraft:llama',
  'minecraft:trader_llama'
]

function charmNeedsTaming(type) {
  return type.indexOf('saintsdragons:') === 0 || CHARM_TAMEABLE_TYPES.indexOf(type) !== -1
}

function charmIsTamed(target) {
  try {
    var tag = target.nbt

    if (!tag) {
      return false
    }

    if (tag.contains('Owner') || tag.contains('OwnerUUID')) {
      return true
    }

    return tag.contains('Tame') && tag.getByte('Tame') === 1
  } catch (err) {
    // Fail closed: a broken check must not hand out free dragons.
    console.error('charm tame check failed: ' + err)
    return false
  }
}

// Filtered to the charm in Java, so using any other item on any mob never
// reaches this script.
ItemEvents.entityInteracted(CHARM_ITEM, event => {
  var player = event.player
  var target = event.target

  if (!player || !target) {
    return
  }

  if (!charmNeedsTaming(String(target.type))) {
    return
  }

  if (charmIsTamed(target)) {
    return
  }

  event.cancel()
  player.tell('Tame it the hard way first. The charm only binds what already answers to you.')
})
