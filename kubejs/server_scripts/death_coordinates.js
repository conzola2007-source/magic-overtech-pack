// Tells a player where they died, in chat, to them only (Moe, 2026-11-08).
// Items go into a GraveStone grave at that spot (2026-11-17); this just says where.
//
// Cost: fires once per player death, filtered to players in Java. No polling.
// Never cancels the death and catches its own errors, so a failure here can't
// touch the drops.
EntityEvents.death('minecraft:player', event => {
  try {
    var player = event.entity
    var x = Math.floor(player.x)
    var y = Math.floor(player.y)
    var z = Math.floor(player.z)
    var dim = String(player.level.dimension)
    var name = dim.indexOf(':') >= 0 ? dim.substring(dim.indexOf(':') + 1).replace(/_/g, ' ') : dim
    player.tell(Text.of('You died at ' + x + ' ' + y + ' ' + z + ' in ' + name + '. Your items are in your grave there.').gold())
  } catch (err) {
    console.error('death coordinates failed: ' + err)
  }
})
