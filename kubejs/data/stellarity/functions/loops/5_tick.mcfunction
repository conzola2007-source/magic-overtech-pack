# Magic Overtech 2026-11-03: trimmed override of Stellarity. Moe keeps End generation,
# the dragon fight and the mobs; item effects, visuals and advancements are cut because they
# scan every entity on a timer (TPS rule in magic-overtech-4.md). Original is in the jar.
# To revert: delete kubejs/data/stellarity/functions/{main,utils/main,loops/*}.mcfunction
# Bossbar Clears
bossbar set stellarity:eol players
execute at @e[type=vindicator,tag=stellarity.eol] run bossbar set stellarity:eol players @a[distance=..100]

# Shulker Armor Shulker Bullet targetting


schedule function stellarity:loops/5_tick 5t
