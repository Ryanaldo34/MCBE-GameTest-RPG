tag @e[type=item,name=dirt,c=1] add destroy
execute @e[type=item,name=dirt,tag=destroy] ~~~ fill ~1 ~ ~1 ~-1 ~-1 ~-1 air 0 destroy
scoreboard players add @p[scores={perkpoints=1..}] crafting 1
scoreboard players remove @p[scores={crafting=1..}] crafting 1