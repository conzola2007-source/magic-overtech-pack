// Saint's Dragons stay wild until the Draconic Age, part two.
// Varasuchus tames by "rodeo": you climb onto a wild one and ride it until it
// gives in. dragon_taming_gate.js only blocks feeding, so riding slipped past.
// This cancels any player mounting an unowned saintsdragons: entity before the
// player has draconic_age. Owned dragons are untouched.
//
// EntityMountEvent fires from Entity.startRiding, so it catches every route
// onto the dragon, not just a right-click. Startup script because ForgeEvents
// only lives here in KubeJS 6. Server side only; the client follows the server.
//
// 2026-11-03: the first version called rider.level(), which threw on every
// mount, and the fail-closed catch then cancelled ALL mounting (horses too).
// Now the dragon check runs first and only dragons can ever be cancelled.
const DRAGON_MOUNT_STAGE_UTIL = Java.loadClass('com.decursioteam.decursio_stages.utils.StageUtil')
const DRAGON_MOUNT_ENTITY_TYPE = Java.loadClass('net.minecraft.world.entity.EntityType')

ForgeEvents.onEvent('net.minecraftforge.event.entity.EntityMountEvent', event => {
  var dragon = event.getEntityBeingMounted()
  if (!dragon) return
  var id = ''
  try {
    // KubeJS may hand back the id string ("saintsdragons:x") or the raw
    // EntityType (prints as "entity.saintsdragons.x"); handle both.
    var t = dragon.getType()
    id = String(t)
    if (id.indexOf(':') < 0) id = String(DRAGON_MOUNT_ENTITY_TYPE.getKey(t))
  } catch (err) {
    console.error('dragon mount gate: could not read entity id: ' + err)
    return
  }
  if (id.indexOf('saintsdragons:') !== 0) return

  try {
    if (!event.isMounting()) return
    if (event.getLevel().isClientSide()) return
    var rider = event.getEntityMounting()
    if (!rider || !rider.isPlayer()) return
    if (DRAGON_MOUNT_STAGE_UTIL.hasStage(rider, 'draconic_age')) return

    if (typeof dragon.isTame === 'function' && dragon.isTame()) return
    var tag = dragon.getNbt()
    if (tag && (tag.contains('Owner') || tag.contains('OwnerUUID'))) return

    event.setCanceled(true)
    rider.tell('This dragon will not carry you before the Draconic Age.')
  } catch (err) {
    // Fail closed, but only for dragons: a broken check must not hand out free dragons.
    console.error('dragon mount gate check failed: ' + err)
    event.setCanceled(true)
  }
})
