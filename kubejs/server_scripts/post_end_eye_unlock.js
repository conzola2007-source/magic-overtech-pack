// Vanilla Eyes of Ender are locked until the player reaches the End. End
// Remastered's own eyes carry the first portal; after that ordinary eyes work in
// any frame. The end_eyes stage lifts the restriction in
// config/decursio_stages/restrictions/end_eyes.json.
//
// Rhino here throws "redeclaration of var X" when a const inside a function body
// is evaluated more than once, so everything below the top level uses var.
const END_EYES_STAGE_UTIL = Java.loadClass('com.decursioteam.decursio_stages.utils.StageUtil')
const END_EYES_STAGE = 'end_eyes'
const END_EYES_ADVANCEMENT = 'minecraft:story/enter_the_end'

function grantEndEyes(player) {
  if (!player) {
    return
  }

  try {
    if (END_EYES_STAGE_UTIL.hasStage(player, END_EYES_STAGE)) {
      return
    }

    player.server.runCommandSilent('decstages add ' + player.username + ' ' + END_EYES_STAGE)
    player.tell('Eyes of Ender answer to you now. Any frame, as many as you like.')
  } catch (err) {
    console.error('end_eyes grant failed for ' + player.username + ': ' + err)
  }
}

// Primary path: the moment the End advancement lands.
PlayerEvents.advancement(event => {
  try {
    if (String(event.advancement.id) === END_EYES_ADVANCEMENT) {
      grantEndEyes(event.player)
    }
  } catch (err) {
    console.error('end_eyes advancement check failed: ' + err)
  }
})

// Backstop: checked once when a player joins, not on a tick loop. grantEndEyes
// already skips anyone who has the stage, so this is a single cheap call.
PlayerEvents.loggedIn(event => {
  var player = event.player

  if (!player) {
    return
  }

  try {
    if (String(player.level.dimension).indexOf('the_end') !== -1) {
      grantEndEyes(player)
    }
  } catch (err) {
    console.error('end_eyes login check failed: ' + err)
  }
})
