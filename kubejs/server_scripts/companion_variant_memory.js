// Loyal Companions' Totem stores level, stats, rarity and name, but not the
// entity's appearance, so a shrine revive rerolls how the mob looks. This
// remembers a companion's appearance and puts it back on the revived one.
//
// COST, DELIBERATELY: nothing here is registered against mobs at all. The
// snapshot runs when you right-click a mob with the Capture Charm, filtered to
// that item in Java. The restore runs when you right-click a Companion Shrine,
// which is the only path that loses appearance - Despawn and Summon Stored keep
// it, because CompanionData holds entityData while the Totem item does not.
// A wolf spawning, dying or existing costs this script nothing.
//
// Rhino here throws "redeclaration of var X" when a const inside a named
// function body is evaluated twice, so everything below the top level uses var.
const VARIANT_MEMORY_KEYS = [
  'TextureVariantId',
  'VariantId',
  'VariantResourceId',
  'Gender',
  'Color',
  'Scale',
  'Breed',
  'Variant',
  'Pattern',
  'Skin'
]

const VARIANT_MEMORY_SLOT = 'loyalCompanionVariant'
const VARIANT_MEMORY_TYPE_SLOT = 'loyalCompanionVariantTypes'
const VARIANT_MEMORY_CHARM = 'loyalcompanions:companion_charm'
const VARIANT_MEMORY_RESTORE_DELAY = 40

const VARIANT_MEMORY_WATCHED = [
  'saintsdragons:raevyx',
  'saintsdragons:stegonaut',
  'saintsdragons:cindervane',
  'saintsdragons:varasuchus',
  'saintsdragons:ignivorus',
  'saintsdragons:volitans',
  'saintsdragons:nulljaw',
  'minecraft:wolf',
  'minecraft:cat',
  'minecraft:parrot',
  'minecraft:horse',
  'minecraft:donkey',
  'minecraft:mule',
  'minecraft:llama'
]

function variantMemoryOwner(tag) {
  if (!tag) {
    return null
  }

  if (tag.contains('Owner')) {
    return String(tag.get('Owner'))
  }

  if (tag.contains('OwnerUUID')) {
    return String(tag.get('OwnerUUID'))
  }

  return null
}

function variantMemoryBag(server, slot) {
  var root = server.persistentData

  if (!root.contains(slot)) {
    root.put(slot, NBT.compoundTag())
  }

  return root.getCompound(slot)
}

// Fires only on a Capture Charm right-click, filtered to that item in Java.
ItemEvents.entityInteracted(VARIANT_MEMORY_CHARM, event => {
  var entity = event.target

  if (!entity || VARIANT_MEMORY_WATCHED.indexOf(String(entity.type)) === -1) {
    return
  }

  try {
    var tag = entity.nbt
    var owner = variantMemoryOwner(tag)

    if (!owner) {
      return
    }

    var snap = NBT.compoundTag()
    var found = 0
    var i = 0

    for (i = 0; i < VARIANT_MEMORY_KEYS.length; i++) {
      if (tag.contains(VARIANT_MEMORY_KEYS[i])) {
        snap.put(VARIANT_MEMORY_KEYS[i], tag.get(VARIANT_MEMORY_KEYS[i]))
        found++
      }
    }

    if (found === 0) {
      return
    }

    var type = String(entity.type)

    variantMemoryBag(entity.server, VARIANT_MEMORY_SLOT).put(owner + '|' + type, snap)
    variantMemoryBag(entity.server, VARIANT_MEMORY_TYPE_SLOT).putBoolean(type, true)
  } catch (err) {
    console.error('variant memory snapshot failed: ' + err)
  }
})

// The shrine revive spawns a fresh entity a few seconds after the ritual starts,
// so one right-click schedules two one-shot looks and nothing else.
const VARIANT_MEMORY_SHRINE = 'loyalcompanions:companion_shrine'
const VARIANT_MEMORY_LOOKS = [200, 400]
const VARIANT_MEMORY_RADIUS = 12

function variantMemorySweep(player) {
  try {
    var all = variantMemoryBag(player.server, VARIANT_MEMORY_SLOT)

    if (all.allKeys.isEmpty()) {
      return
    }

    player.level.getEntitiesWithin(player.boundingBox.inflate(VARIANT_MEMORY_RADIUS)).forEach(entity => {
      var type = String(entity.type)

      if (VARIANT_MEMORY_WATCHED.indexOf(type) === -1) {
        return
      }

      var owner = variantMemoryOwner(entity.nbt)

      if (!owner) {
        return
      }

      var key = owner + '|' + type

      if (!all.contains(key)) {
        return
      }

      entity.mergeNbt(all.getCompound(key))
      console.info('variant memory restored ' + type)
    })
  } catch (err) {
    console.error('variant memory restore failed: ' + err)
  }
}

BlockEvents.rightClicked(VARIANT_MEMORY_SHRINE, event => {
  var player = event.player

  if (!player) {
    return
  }

  VARIANT_MEMORY_LOOKS.forEach(delay => {
    player.server.scheduleInTicks(delay, () => variantMemorySweep(player))
  })
})
