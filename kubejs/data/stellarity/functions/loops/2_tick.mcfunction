# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction
# Pixie sounds, particles, etc.
execute as @e[type=vex,tag=stellarity.pixie] at @s run function stellarity:mobs/pixie/loop


## Item loops
# Spirit Dagger
# Dragonblade
# Starstruck Carcanet
# Prismatic Pearl
# Tamaris
# Spellbooks

schedule function stellarity:loops/2_tick 2t
