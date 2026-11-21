# Solara Bay — Street Kings

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/wz5200/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/wz5200/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — the most complete open-world crime game an agent can build, playing offline in a desktop browser from static files.

## The game

Jax Marlowe came home to Solara Bay owing $8,000 to Rosa Delgado, the fixer who runs the garage in Old Town. Six jobs. No questions. Pay it off — or the Bay keeps you.

**Solara Bay** is a 2D top-down open world with five districts — Downtown, Beachside, Old Town, Harbor and Palm Heights — with streets, buildings, parks, a beach and a marina. On foot (WASD, Shift to run) or behind the wheel: steal any car with **E**, drive it, and exit with **E**. Traffic cars cruise the streets, pedestrians walk the sidewalks and flee when scared, and the Bay PD chases you with police cars and foot cops when your wanted level (0–5 stars) rises — from stealing cars, hitting pedestrians, speeding past police, or shooting. Lay low and the heat cools off; get caught and you're **Busted**, go down and you're **Wasted**, respawning with a fine.

Six story missions pay off the debt one job at a time: a garage pickup, a beach briefcase run, five cash drops, a hot pursuit escape, a gang shootout at the Harbor, and a final getaway. Combat is mouse-aimed pistol fire (click to shoot) and punching (Space), with weapon, health and cash pickups around the city. The HUD shows cash, health, wanted stars, the clock, the current objective and a live minimap with the player, police, traffic and the mission marker.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no audio files — all sound (engine, sirens, gunshots, footsteps, mission jingles) is synthesised with WebAudio. Keyboard + mouse, desktop browser.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Shift | Run |
| E | Steal / exit car |
| Mouse + click | Aim / shoot |
| Space | Punch |
| M | Start / recap mission |
| F / L | Save / load (localStorage) |
| P / Esc | Pause |

## Screenshots

`?scene=` stages real gameplay for screenshots: `chase` (3-star pursuit in a stolen taxi), `mission` (Harbor gang shootout), `foot` (Downtown on foot), `city` (Beach Run mission), `start` (title screen).

## Credits

All city, characters, vehicles, names, story, art, sound and music are original. Nothing from Rockstar Games. Built with plain HTML5 Canvas and ES modules — no libraries.
