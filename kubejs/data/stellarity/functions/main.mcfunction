# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction
function stellarity:mechanics/main
function stellarity:mobs/main

# Helpful stuff :D
function stellarity:utils/main

# Some Minecraft change causes default Ender Dragon to spawn
# no matter what in 1.19, and this is ruining the whole system
# It DOES NOT come with the tags though! Nor the special marker!
# So I can just butcher the dragon in the most painless way possible!
execute unless score #stellarity.vanilla_dragon_butcher.setup stellarity.misc matches 1 in minecraft:the_end run function stellarity:mobs/dragon/butcher/setup
execute if entity @e[type=minecraft:ender_dragon,tag=!fe.boss,tag=!fe.ender_dragon,tag=!fe.init,tag=!fe.mob,predicate=stellarity:locations/in_dragons_den] run schedule function stellarity:mobs/dragon/butcher/scheduled 1t append

# Exit Portal loop
# Used for stuff like respawn checks, etc.
execute as @e[type=minecraft:marker,tag=fe.exit_portal] at @s run function far_end:structures/exit_portal/main

# Scheduled checks for End Portal animation
execute as @e[type=marker,tag=stellarity.end_portal_animation,tag=stellarity.end_portal_animation.check_schedule] at @s run function stellarity:visuals/end_portal_animation/checks/base

# From visuals/main: the stronghold portal animation, which places the portal itself
execute as @e[type=marker,tag=stellarity.end_portal] at @s run function stellarity:visuals/end_portal_animation/marker_loop
execute as @e[type=marker,tag=stellarity.end_portal_animation] at @s run function stellarity:visuals/end_portal_animation/animation/main
