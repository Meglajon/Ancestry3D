# Ancestry 3D

Walk among your ancestors. Load a GEDCOM family tree and explore it as the person you choose: you start in the
middle of a courtyard where every ancestor stands on the ground as a 3D person you can walk up to and talk to.

- **You are the root person.** Pick who you're playing on the setup screen; you start at the centre as them.
- **Generations are paths on the ground.** Walk outward to go back in time. Each ancestor stands directly behind
  the child they descend through, fathers first.
- **Choose a layout** (setup screen):
  - *Full circle*: rings all the way round you.
  - *Half fan*: the same rings squeezed into the half circle in front of you, so everyone is closer together.
  - *Tree*: straight rows that branch out ahead of you like a family-tree chart.
- **Keep couples together** (setup toggle): husbands and wives stand side by side where their family lines meet.
- **Lines of descent** run along the floor: blue through a father, red or pink through a mother. When a family
  married back into itself, the lines cross the courtyard.
- **Dressed for their decade.** Clothes follow the decade of each person's adult life, their class (worked out
  from their job, or a father's or spouse's job), the job itself and some regional dress. That means Tudor
  doublets and coifs, ruffs, periwigs and tricorns, smock-frocks, Regency empire dresses, crinolines and bustles,
  Lancashire shawls and clogs, Welsh tall hats, maids' caps, khaki in the wars, flares and jeans.
- **Colouring from birthplace.** The earliest known ancestors (whose parents aren't in the file) take the typical
  colouring of where they were born; everyone after them blends their parents. A child of Yorkshire parents born
  in India looks like their parents.
- **They talk like where they came from.** Speech is shaped by birthplace (Lancashire, Yorkshire, Geordie,
  Scouse, Black Country, Potteries, Gloucestershire, West Country, Cornish, Cockney, Norfolk, Welsh, Scots,
  Glaswegian, Highland, Irish, Ulster, Dublin, American, Australian and more), by period, and by the schooling
  their work suggests. They tell you their name, relationship, birth, jobs and what that work was like,
  marriages and children, death and burial, notes from the file, and real local history they lived through.
- **Find people**: dialogue options set a waypoint to their parents or back to their child. The map
  (Tab / M / MAP) shows the whole tree from above; search by name or tap someone to set a waypoint.

### Looks

| Look | What you get |
|---|---|
| **Retro** | 90s demon-shooter: flagstones, brick walls, torches, a burning sky, a status bar with your own face, and a **minigun**. The courtyard is dotted with toxic barrels (shoot them and they explode, setting off any next to them), burning barrels, tech lamps, candelabras, crate stacks, broken pillars and boxes of bullets to top up your ammo. |
| **Platform** | A bright 3D-platformer land: checkered grass, yellow brick paths, rolling hills, floating brick platforms and coins to collect. **Jump** on platforms and bounce on your ancestors' heads. |
| **Blocks** | A voxel world: grass blocks, gravel paths, block trees, cube-headed people, a hotbar and XP bar, and you can **punch**. |
| **Island** | A bright, cozy island seen from behind your own villager, with round villagers and speech-bubble chats. |

Ancestors who get hit, punched or jumped on flinch and tell you off in their own accent. Nobody is hurt.

Your GEDCOM file is read in the browser and never uploaded. The page remembers your last tree, your look and who
you've met in local storage on your device.

## Play

- **Double-click `index.html`.** It is a single self-contained file, so it works straight from your disk, on
  GitHub Pages, or any web host. It needs an internet connection the first time to fetch three.js and the fonts.
- **Demo:** press *Play the demo family* to explore a fictional family from Lancashire, Yorkshire, the Black
  Country, Ireland, Jamaica and more.

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD, arrow keys (left/right turn) | Left thumb stick |
| Look | Mouse (click to capture) | Drag on the right side |
| Run | Shift | RUN button, or push the stick to its edge |
| Talk | E / Space / Enter, 1–9 picks an option | TALK button, or tap the right side |
| Fire / punch | Left mouse / Ctrl | FIRE / PUNCH button |
| Jump (Platform) | Space | JUMP button |
| Map | Tab / M | MAP |
| Menu | Esc | ☰ |

Phones work in portrait, but landscape gives the best view.

## Host it on GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / root. The game will be at `https://<user>.github.io/<repo>/`.

## Develop

Plain ES modules, no framework. three.js r160 is loaded from jsDelivr through an import map.

```
index.html          built, self-contained game (generated, don't edit by hand)
dev.html            source page: HUD, menus, styles for all four looks (loads js/* as modules; needs a local server)
js/gedcom.js        GEDCOM parser (any line endings, CONC/CONT, shared notes, all life events, ANSI/UTF-16 decoding)
js/ancestry.js      ancestor walk (Ahnentafel, pedigree collapse), relationships, ground layout, couples
js/places.js        place gazetteer: region, dialect and colouring for a GEDCOM place
js/traits.js        per-person class, schooling, dress decade, inherited colouring
js/outfits.js       period wardrobe by decade, sex, class, job and region
js/npc.js           blocky, voxel and island figure builders (4 draw calls near, 1 far)
js/world.js         generation paths, descent lines, NPCs, beacon; Retro and Island environments
js/guides.js        generation paths for any layout (rings, arcs or rows), floor labels, open-spot finder
js/props.js         Retro props: barrels, lamps, candelabras, crates, pillars, ammo pickups, explosions
js/envs.js          Platform and Blocks environments (platforms and coins included)
js/dialogue.js      dialect, period and schooling-aware speech, job memories, local history
js/weapon.js        minigun and arm viewmodels, impacts, shot tracing
js/textures.js      procedural pixel-art textures and portraits
js/main.js          renderer, controls, cameras, jumping, interaction, dialogue box, HUDs, map
sample/demo.ged     fictional demo family (regenerate with npm run demo)
tools/              demo generator and single-file builder
tests/              parser/layout tests (npm test) and a headless browser smoke test
```

```
npm test            # parser, dates, layout spacing (incl. a 2,047-person tree, couples mode and every layout)
npm run build       # writes index.html (self-contained) and dist/artifact.html
```

While developing, serve the folder (e.g. `python3 -m http.server`) and open http://localhost:8000/dev.html,
then run `npm run build` to refresh `index.html`.

### Layout

Each person owns a wedge (an angle in the fan layouts, a share of the width in the tree layout) proportional to the number of family lines behind them, split between their
father and mother. With couples together, each father/mother pair is placed as one unit where their two wedges
meet, standing 1.4 m apart. Generations are at least 7 m apart and grow just enough that neighbours stay about 2.8 m apart; crowded outer generations are packed into up to five staggered rows, so even a
complete 10-generation tree stays walkable. Large trees tighten the fog (which doubles as draw distance) to keep
phones smooth.
