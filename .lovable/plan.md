

# FootSim Video Generator — Plan

## Overview
A React web app that simulates football matches with bouncing team logos inside a neon-lit circular arena, then exports the result as MP4 video with full audio (background music + sound effects).

## 1. UI Layout (Vertical, Mobile-First)
- **Canvas preview** (9:16 ratio) centered at the top
- **Team configuration panel** below with:
  - Team A & B: name input, logo upload (drag-and-drop), color picker for glow trails
  - Logos auto-cropped to circles with neon glow effect
- **Match settings**: competition name text input
- **Controls**: "Lancer Simulation" / "Arrêter" buttons
- **Export**: large "Générer Vidéo MP4" button

## 2. Physics Engine (Matter.js)
- Circular arena boundary with neon glow rendering
- Two rigid-body circles (team logos) bouncing with low gravity, high restitution
- A rectangular neon goal net placed strategically inside the arena
- Goal detection: when a logo center crosses the goal opening
- Fully random physics — no scripted outcomes

## 3. Visual Effects (Canvas Rendering)
- Dark purple/blue gradient background
- Neon glow on arena walls, goal net, and logo outlines
- Motion trails: each logo leaves a colored light trail behind it
- **Score overlay** at top: team logos, live score, simulated match timer (0'→90')
- **End-of-match overlay**: "MATCH TERMINÉ" with stencil/sport typography, final score, competition name

## 4. Audio System
- Background phonk/energetic music track (user provides or we include a placeholder)
- Bounce sound effects on wall/logo collisions
- Goal sound effect (crowd roar / horn) on each goal
- Audio mixed into the final export via Web Audio API

## 5. Video Export (FFmpeg.wasm)
- Record canvas via MediaRecorder API during simulation
- Mix the WebM video stream + audio tracks using FFmpeg.wasm into a final MP4 container
- Provide download link when encoding completes
- Progress indicator during encoding

## 6. Tech Stack
- React + TypeScript + Tailwind CSS
- Matter.js for 2D physics
- HTML5 Canvas for rendering (not DOM-based)
- MediaRecorder API for capture
- FFmpeg.wasm for MP4 encoding
- Web Audio API for sound mixing

## Key Files to Create
- `src/pages/Index.tsx` — main app layout
- `src/components/SimulationCanvas.tsx` — Matter.js + Canvas rendering
- `src/components/TeamConfig.tsx` — team name/logo/color inputs
- `src/components/MatchConfig.tsx` — competition name input
- `src/components/ScoreOverlay.tsx` — score HUD (rendered on canvas)
- `src/hooks/usePhysicsEngine.ts` — Matter.js setup & simulation loop
- `src/hooks/useVideoExport.ts` — MediaRecorder + FFmpeg.wasm encoding
- `src/hooks/useAudioEngine.ts` — Web Audio API for sounds
- `src/lib/canvasRenderer.ts` — neon effects, trails, overlays drawing

