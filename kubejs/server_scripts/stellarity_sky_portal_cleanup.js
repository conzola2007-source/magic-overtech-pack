// Stellarity parks the vanilla exit portal at the build limit on purpose:
// butcher/setup puts dirt at 0 255 0 so vanilla builds its portal up there,
// and butcher/kill wipes y253-255 when it kills the vanilla dragon. But vanilla
// rebuilds that portal at its saved spot (0 255 0) every time a dragon dies,
// and nothing clears it again. The dragon lands on the highest block at 0,0,
// so it perched on that tiny disc in the sky instead of Stellarity's portal
// (Moe, 2026-11-04).
//
// Fix: clear the same box Stellarity clears, a little after any dragon dies
// (vanilla rebuilds the portal ~200 ticks into the death animation) and shortly
// after any dragon joins the world (covers respawns and worlds that already
// have the disc). Event-driven only, no tick or polling.
const SKY_PORTAL_CLEAR = 'execute in minecraft:the_end run fill 3 255 3 -3 253 -3 minecraft:air'

function clearSkyPortal(server, delay) {
  server.scheduleInTicks(delay, () => {
    server.runCommandSilent(SKY_PORTAL_CLEAR)
  })
}

EntityEvents.death('minecraft:ender_dragon', event => {
  clearSkyPortal(event.server, 240)
})

EntityEvents.spawned('minecraft:ender_dragon', event => {
  if (!event.server) return
  clearSkyPortal(event.server, 20)
})
