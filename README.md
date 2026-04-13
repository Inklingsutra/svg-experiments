# SVG Experiments

A vanilla JavaScript SVG animation project exploring kaleidoscopic motion, reactive hex patterns, and visual trails.

## Overview

This project uses SVG, CSS, and plain JavaScript to create an animated visual scene with:
- a central rotating logo and pulsing ring system
- replicated kaleidoscope scenes using SVG `<use>` elements
- a responsive hex grid that reacts to animated wave paths
- fading trails, energy pulses, and ring animations

## Files

- `index.html` – main HTML file containing the SVG scene markup
- `styles.css` – global styling for full-screen SVG layout and element appearance
- `script.js` – animation logic and SVG element generation
- `assets/` – backup script copies and additional project assets

## How to run

Open `index.html` directly in a modern browser, or run a local server from the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes

- The animation is rendered entirely with SVG and `requestAnimationFrame`
- The current visual system is driven by time-based motion, beat timing, and procedural wave interactions
- The project is designed for full-screen display and scales with the browser viewport

## Potential improvements

- add responsive resize handling for dynamic viewport changes
- clean up the `assets/` directory if the backup script copies are no longer required
- add optional audio synchronization for BPM-driven effects
- extract repeated DOM creation logic into reusable helpers

## Milestone

This milestone includes:
- updated interactive SVG animation logic
- responsive kaleidoscopic scene replication
- enhanced hex grid reaction and pulse effects
- improved visual motion and trail rendering

The code is now committed and published as a milestone update.

## GitHub

This repository has been initialized locally as a Git project. Add a remote and push to link it to your GitHub repository.
