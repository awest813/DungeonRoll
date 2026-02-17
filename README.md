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

## Features

### Phase 1: Foundation ✓
- ✓ Babylon.js scene with diorama board (ground + lighting + isometric camera)
- ✓ Finite state machine (TITLE → MAP → EVENT → COMBAT → REWARD → MAP)
- ✓ UI overlay showing current state
- ✓ "Advance State" button to cycle through states
- ✓ Clean separation: rules engine never imports Babylon
- ✓ Ready for data-driven content in `/src/content/`

### Phase 2: Rules Engine ✓
- ✓ Dice rolling system (d4-d20, NdM+K expressions like "2d6+3")
- ✓ Combat engine (3 party vs 1 enemy)
- ✓ Actions: Attack, Guard
- ✓ Armor reduces damage by flat amount (doubled when guarding)
- ✓ Combat logging system
- ✓ Status effects framework
- ✓ Test harness for console testing

### Phase 3: Combat UI ✓
- ✓ Interactive combat screen with party/enemy HP displays
- ✓ Color-coded HP bars (green → yellow → red)
- ✓ Attack, Guard, and End Turn buttons
- ✓ Scrolling combat log
- ✓ Simple enemy AI (random targeting)
- ✓ Victory/defeat detection
- ✓ Visual guard indicators (🛡️)

## Troubleshooting

### Blank white/black screen?

1. **Check browser console** (F12 → Console tab)
   - Look for JavaScript errors
   - Should see "Loading Dungeon Roll..." and initialization logs

2. **Try development mode**: `npm run dev`
   - Opens at http://localhost:5173/
   - Provides better error messages

3. **Check the console logs**:
   ```
   DOMContentLoaded event fired
   Canvas element found
   Babylon engine initialized
   Game initialized
   Combat UI ready!
   ```

4. **If you see errors**, common fixes:
   - Clear browser cache
   - Try a different browser
   - Check console for specific error messages

### Testing in console

```javascript
runCombatTest()     // Run automated combat test
combat.show()       // Show combat UI
combat.hide()       // Hide combat UI
combat.enemyTurn()  // Trigger enemy attack manually
```

## Thank you!

Thank you for using it, feel free to contribute in any way you can/want, just keep in mind that this should stay as a very mimimalistic boilerplate. 
If you'd like to add complexity just fork it and let me know when you're done, so that I might reference it here in case someone comes looking for a more opinionated environment.

Enjoy!
