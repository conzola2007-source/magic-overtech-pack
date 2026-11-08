// After a death, the player respawns with a Recovery Compass, which points at
// where they last died (vanilla tracks that). For players who don't read
// coordinates (Moe, 2026-11-08). Pairs with death_coordinates.js.
//
// Only one: none is given if they already carry a Recovery Compass. Not given
// after leaving the End, which also counts as a respawn.
//
// Cost: fires once per respawn. No polling. Catches its own errors.
PlayerEvents.respawned(event => {
  try {
    // keepData is KubeJS's flag for a respawn on leaving the End, not a death.
    if (event.keepData) return
    var player = event.entity
    if (player.inventory.find('minecraft:recovery_compass') >= 0) return
    player.give('minecraft:recovery_compass')
  } catch (err) {
    console.error('death compass failed: ' + err)
  }
})
