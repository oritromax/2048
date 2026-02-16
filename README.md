# 2048

A browser-based implementation of the 2048 puzzle game. Move tiles, merge matching numbers, and try to reach the 2048 tile—or beyond.

> The sole reason i created this is the other ones are either full of ads or doesn't have a proper dark mode.

### Hosted at [2048.shost.vip](https://2048.shost.vip)

## How to play

- Use **arrow keys** (or swipe on touch devices) to move all tiles in that direction.
- When two tiles with the same number touch, they **merge into one** (their values add).
- After each move, a new tile (2 or 4) appears. Keep merging to free space and grow the board.

## Features

- **Power-ups**
  - **Undo** — Revert to the state before your last move (keyboard: `Ctrl`/`⌘` + `Z`).
  - **Swap** — Swap the positions of any two tiles (click the button, then two tiles).
  - **Remove** — Remove all tiles of a chosen value (click the button, then one tile).
- **Dark / light theme** — Toggle in the UI; preference is saved in `localStorage`.
- **Responsive** — Works on desktop and mobile; touch-friendly.

## Run locally

No build step. Open `index.html` in a browser, or serve the folder with any static server, for example:

```bash
# Python 3
python -m http.server 8000

# Node (npx)
npx serve .
```

Then visit `http://localhost:8000` (or the port your server uses).

## Tech

- Single-file HTML/CSS/JavaScript.
- No frameworks or build tools required.

## Credits

- By [Oritro](https://ioritro.com)
- Original 2048 by [Gabriele Cirulli](https://gabrielecirulli.com). Based on [1024](https://asherv.com/threes/) by Veewo Studio and conceptually similar to [Threes](https://asherv.com/threes/) by Asher Vollmer.
