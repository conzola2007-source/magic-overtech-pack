// Blocks portal-frame activation before end_access.
const StageUtil = Java.loadClass('com.decursioteam.decursio_stages.utils.StageUtil')

BlockEvents.rightClicked('minecraft:end_portal_frame', event => {
  const player = event.player

  if (!player) {
    return
  }

  if (StageUtil.hasStage(player, 'end_access')) {
    return
  }

  event.cancel()
  player.tell('You need End Access before using End Portal Frames.')
})
