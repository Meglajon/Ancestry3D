# Promo: Ancestry: A Battle in Time (20 seconds)

`ancestry-a-battle-in-time-promo.mp4` is a 20-second hook trailer: 1920×1080, 30 fps, H.264 with AAC stereo.
`ancestry-a-battle-in-time-promo-9x16.mp4` is the same edit and music laid out for phones (1080×1920, for TikTok,
Reels and Shorts). The cut-scene portraits are lifted out of the footage and enlarged above a bigger dialogue box,
the gameplay is reframed around the car, and the words sit clear of the apps' top and bottom overlays.
Everything in it is the real game: the footage is recorded from Story mode with the demo family, and the
dialogue is the game's own lines, trimmed to fit.

| Time | Part | Picture | Music |
|---|---|---|---|
| 0.0–1.6 | The threat | A parish register. Three names are rubbed out. **SOMEONE IS ERASING YOUR FAMILY** | A clock ticking in time, a heartbeat, a low drone, the scrape of a rubber |
| 1.6–5.0 | Silas | Opening cut scene: *"Start the time engine. We are going to erase a family from history."* | Drone and a cold bell, then a reverse swell into a punch-in on his face |
| 5.0–8.0 | The ally | Dorothy: *"Not while I'm breathing, Silas Hargreaves."* Then the Heirloom, tagged | A braam, a plucky pizzicato ostinato, a snare roll and the engine revving |
| 8.0–12.0 | The chase | Ramming the grey van with the police behind. A time jump back to 1844. **4 CENTURIES / 1 VERY OLD CAR** | The drop: drums, octave bass, saw arpeggio, whooshes and a police two-tone |
| 12.0–15.0 | The finale | Engine No. 1 hops 1937 → 2026 → 1989 → 1791, and Silas: *"You have thousands of them! I only ever wanted one!"* | A hit on every hop, then a snare roll and riser into white |
| 15.0–20.0 | The call | **ANCESTRY / A BATTLE IN TIME**, a pedigree lighting up, *Save the ______ family*, **Load your family tree ▶** | An impact into D major: a warm pad, climbing bells, a held chord |

## Rebuilding it

You need Python with `playwright numpy scipy pillow imageio-ffmpeg` (then `python -m playwright install chromium`).

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Run that from the repo root and leave it running. Then, from `promo/`:

```bash
python capture.py cut footage && python capture.py chase footage && python capture.py finale footage
```

```bash
python music.py music.wav
```

```bash
python render.py footage music.wav out/promo.mp4
```

Add `--v` for the 9:16 cut:

```bash
python render.py footage music.wav out/promo-9x16.mp4 --v
```

- `gamecap.py` opens Story mode on a fake clock, so every frame is recorded at an exact time, however slow the
  machine is.
- `capture.py` drives the game through its debug hooks (`window.__A3D.storyState().debug`).
- `music.py` synthesises the score from scratch, so there are no licensing questions.
- `compose.html` draws each frame: the footage, the colour grade and every motion graphic. `?base=` points it at the
  footage folder, and `?v=1` switches it to the 9:16 layout. Open it in a browser and call `renderFrame(n)` to look
  at any frame.
- `render.py footage --stills sheet.jpg 30 90 150` renders a contact sheet of chosen frames, for checking the edit
  (with `--v` for the tall cut).

The cut list (`CUT`) and the footage in-points (`SRC`) are at the top of `compose.html`. The chase take used in
the video is `footage/chase3`, from a second recording of the chase, and the finale's hops land at footage frames
90, 110, 149 and 169. The timing of the music's hits is in `music.py`. If you record new footage, check these line
up again.
