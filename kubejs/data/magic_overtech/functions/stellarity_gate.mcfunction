# Magic Overtech 4.2 - 2026-09-21
# Stellarity registers stellarity:main in #minecraft:tick. That loop runs 97
# entity scans every tick, several of them nbt= selectors that serialize every
# candidate entity. Measured at 12.08% of the server thread while nobody was in
# the End. This gates the whole loop behind a dimension check.
# Cost when no player is in the End: one location_check predicate per player.
# To revert: delete this file and kubejs/data/minecraft/tags/functions/tick.json
execute if entity @a[predicate=stellarity:locations/in_the_end] run function stellarity:main
