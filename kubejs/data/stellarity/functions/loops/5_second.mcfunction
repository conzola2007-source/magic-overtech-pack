# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction
function stellarity:mobs/stronghold/main

# Moved from visuals/main

# Moved from far_end:structures/check
execute as @e[type=minecraft:end_crystal,predicate=stellarity:utils/exit_portal_crystal] at @s run function far_end:structures/replace/exit_portal

execute as @e[type=slime,tag=stellarity.gloop] at @s run function stellarity:mobs/gloop/main

# End Portal noises
execute as @e[type=marker,tag=stellarity.end_portal] at @s run function stellarity:visuals/end_portal_animation/ambient_sounds

# Duskberry Night Vision


schedule function stellarity:loops/5_second 5s
