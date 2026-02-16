# Dungeon Roll - Tabletop JRPG Engine

## Description

A web-based tabletop JRPG engine inspired by Crimson Shroud, built with:
- **Vite** + **TypeScript** + **Babylon.js**
- Finite state machine architecture (TITLE → MAP → EVENT → COMBAT → REWARD → MAP)
- Separation of pure rules logic from rendering
- Data-driven content system

## instructions

- clone or download the repo
- npm install
- For development: `npm run dev`
- For production: `npm run build` then to preview what was built `npm run preview`

## Development mode and debugging
First `npm run dev`
Then in vscode press F5, otherwise just open a browser at http://localhost:3000/

## Live Demo
You can see this repository live here:
https://babylonjs-vite-boilerplate.vercel.app/

## Production build
First `npm run build`
A `dist` folder is created and contains the distribution. 
You can `npm run preview` it on your development machine.
Production preview runs at http://localhost:5000/ . The terminal will display external URLs if you want to test from a phone or tablet.

## File Structure

```
src/
  main.ts              # Entry point - initializes engine, scene, UI, and game
  game/
    Game.ts            # Pure game logic orchestrator (no Babylon dependencies)
    stateMachine.ts    # Finite state machine implementation
  render/
    createScene.ts     # Babylon.js scene setup (diorama board)
  ui/
    createUI.ts        # DOM-based UI overlay
  content/
    *.json             # Data-driven content (enemies, skills, items, rooms)
```

## Phase 1 Features

- ✓ Babylon.js scene with diorama board (ground + lighting + isometric camera)
- ✓ Finite state machine (TITLE → MAP → EVENT → COMBAT → REWARD → MAP)
- ✓ UI overlay showing current state
- ✓ "Advance State" button to cycle through states
- ✓ Clean separation: rules engine never imports Babylon
- ✓ Ready for data-driven content in `/src/content/`

## Thank you!

Thank you for using it, feel free to contribute in any way you can/want, just keep in mind that this should stay as a very mimimalistic boilerplate. 
If you'd like to add complexity just fork it and let me know when you're done, so that I might reference it here in case someone comes looking for a more opinionated environment.

Enjoy!
