// Saint's Dragons spawn at 15% of their configured rate (Moe, 2026-11-02; halved from 30% on 2026-11-08).
// The weights in config/saintsdragons/server/spawning.toml are integers, mostly
// 1-5, so they can't be scaled cleanly. Instead every natural or
// chunk-generation spawn of a saintsdragons: entity is kept with a 15% chance.
// Eggs, spawn eggs, commands and Apotheosis boss spawns are left alone.
// To change the rate, change DRAGON_SPAWN_KEEP.
//
// Cost: runs once per spawn attempt (not per tick, not per player), and bails
// on the first string check for anything that isn't a dragon.
const DRAGON_SPAWN_KEEP = 0.15
const DRAGON_SPAWN_ENTITY_TYPE = Java.loadClass('net.minecraft.world.entity.EntityType')

EntityEvents.checkSpawn(event => {
  var entity = event.entity
  if (!entity) return
  // KubeJS may give the id string or the raw EntityType; handle both.
  var t = entity.type
  var id = String(t)
  if (id.indexOf(':') < 0) id = String(DRAGON_SPAWN_ENTITY_TYPE.getKey(t))
  if (id.indexOf('saintsdragons:') !== 0) return
  var reason = String(event.type)
  if (reason !== 'NATURAL' && reason !== 'CHUNK_GENERATION') return
  if (Math.random() >= DRAGON_SPAWN_KEEP) event.cancel()
})
