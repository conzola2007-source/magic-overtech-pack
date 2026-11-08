# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction


execute in minecraft:overworld as @e[type=phantom,tag=!stellarity.phantom.aware,distance=0..,nbt={Size:0}] at @s run function stellarity:mobs/phantom/enlarge 
execute as @e[type=phantom] unless score @s stellarity.phantom.size matches 1.. run function stellarity:mobs/phantom/score


# Villagers
execute as @e[type=villager,tag=stellarity.villager.aware,predicate=!stellarity:utils/is_baby,tag=!stellarity.villager.nitwit,tag=!stellarity.villager.has_job] at @s run function stellarity:mobs/villager/main

# Shulker Tools


execute if score #stellarity.dragon.ash_duration stellarity.misc matches 1.. run scoreboard players remove #stellarity.dragon.ash_duration stellarity.misc 1

schedule function stellarity:loops/1_second 1s
