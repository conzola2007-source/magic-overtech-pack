# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction
function #stellarity:dot/tick

# All 'as @a at @s' utility checks happen every 10th tick

execute as @e[type=#stellarity:entity_awareness_checks,tag=!stellarity.aware] run tag @s add stellarity.aware

# Scoreboard event reset
execute as @a[predicate=stellarity:utils/has_utility_scoreboards] run function stellarity:utils/reset_scoreboards

# Respawn detection
# @s, @e and @a will always select a player, dead or alive
# By doing '@e[type=player]', it will only select ones who are alive
# Weird, but it works!
execute as @e[type=player,scores={stellarity.misc.respawn_detection=1..}] run function stellarity:utils/respawn_detection/on_respawn

