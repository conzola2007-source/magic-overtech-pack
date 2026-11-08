// Stops keybinds firing while typing in a text box (Moe, 2026-11-06).
//
// Text boxes report plain letters as "not handled" on key press, because the
// letter itself arrives separately through charTyped. Forge then carries on and
// fires InputEvent.Key, so any mod listening there reacts to what you're typing:
// Aether's accessories key on I closed the Mighty Mail screen, and G did the same
// kind of thing. Cancelling ScreenEvent.KeyPressed.Pre makes Forge return before
// any of that, and charTyped still delivers the letter.
//
// Only plain typing keys are stopped. Backspace, arrows, Enter, Esc and anything
// held with Ctrl or Alt (select all, copy, paste) go through untouched.
//
// Runs only on a key press inside a screen, nothing polls. Client only. Any error
// lets the key through, so a bug here can't stop keys working.
// To revert: delete this file and restart the game.

const TYPING_GUARD_MOD_CTRL_ALT_SUPER = 2 | 4 | 8
var typingGuardErrorLogged = false

function typingGuardIsTypingKey(key) {
  if (key >= 65 && key <= 90) return true // letters
  if (key >= 48 && key <= 57) return true // number row
  if (key >= 320 && key <= 334) return true // numpad digits and symbols
  // space ' , - . / ; = [ \ ] `
  return key == 32 || key == 39 || (key >= 44 && key <= 47) || key == 59 || key == 61 ||
    (key >= 91 && key <= 93) || key == 96
}

function typingGuardInstall() {
  var EditBox = Java.loadClass('net.minecraft.client.gui.components.EditBox')
  var MultiLineEditBox = Java.loadClass('net.minecraft.client.gui.components.MultiLineEditBox')

  var hasFocusedTextBox = function (parent, depth) {
    var children = parent.children()
    for (var i = 0; i < children.size(); i++) {
      var child = children.get(i)
      if ((child instanceof EditBox || child instanceof MultiLineEditBox) && child.isFocused()) return true
      if (depth < 3 && child instanceof Java.loadClass('net.minecraft.client.gui.components.events.ContainerEventHandler')) {
        if (hasFocusedTextBox(child, depth + 1)) return true
      }
    }
    return false
  }

  ForgeEvents.onEvent('net.minecraftforge.client.event.ScreenEvent$KeyPressed$Pre', event => {
    try {
      if (!typingGuardIsTypingKey(event.getKeyCode())) return
      if ((event.getModifiers() & TYPING_GUARD_MOD_CTRL_ALT_SUPER) != 0) return
      if (hasFocusedTextBox(event.getScreen(), 0)) event.setCanceled(true)
    } catch (err) {
      if (!typingGuardErrorLogged) {
        typingGuardErrorLogged = true
        console.error('no_keybinds_while_typing: ' + err)
      }
    }
  })
  console.info('no_keybinds_while_typing: installed')
}

if (Platform.isClientEnvironment()) typingGuardInstall()
