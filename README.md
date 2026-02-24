# Dungeon Roll — Tabletop JRPG Engine

> **Do NOT open `index.html` directly.** Use `npm run dev` to avoid CORS errors.
> See [HOW_TO_RUN.md](HOW_TO_RUN.md) for details.

A web-based dungeon-crawling JRPG built with **Vite + TypeScript + Babylon.js**.
Inspired by Crimson Shroud — every mechanic is dice, status, and strategy.

---

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

Or build for production:

```bash
npm run build
npm run preview      # http://localhost:4173
```

---

## Gameplay

1. **Party Select** — Choose 3 of 5 classes (Knight, Mage, Ranger, Cleric, Rogue).
2. **Dungeon Map** — Navigate a 12-room branching dungeon. Choose your path at crossroads.
   - Rest to recover HP/MP (costs gold)
   - Manage equipment drops
   - Use items from inventory
   - Click a party member to inspect full stats and skills
3. **Event Screen** — Preview enemies before committing to fight.
4. **Combat** — Turn-based, speed-ordered. Choose Attack / Guard / Skill / Item each turn.
   - 30 skills across 5 classes (damage, heal, AoE, buffs, status effects)
   - Enemy AI with 7 roles: basic, tank, bruiser, caster, healer, sniper, boss
   - Status effects: poison, stun, buff, weaken, shield, regen
5. **Reward** — XP, gold, item drops, equipment drops, level-up details.
6. **Repeat** — Clear all rooms to beat the dungeon. Party wipe = run over.

---

## Features

### Engine
- Finite state machine: `TITLE → MAP → EVENT → COMBAT → REWARD → MAP` (or `DEFEAT`)
- Pure rules layer with zero Babylon imports — combat engine is fully testable in Node
- Data-driven content: all enemies, skills, items, equipment, and rooms are JSON

### Combat
- Speed-based turn order (higher speed acts first)
- Armor reduces flat damage; guarding doubles armor for that hit
- Skills cost MP; targeting types: single enemy, all enemies, single ally, all allies, self
- Items usable in combat (potions restore HP/MP, tonics buff ATK, antidotes cure status)
- Dead enemies yield XP and gold; dead party members stay dead for the run

### Progression
- 5 classes, each with unique base stats, growth rates, and learnable skill trees
- XP split equally among surviving party members
- Level-up grants stat growth and may unlock new skills
- 31 equipment pieces across weapon/armor/accessory slots, 3 rarities, with class restrictions
- Equipment bonuses apply/remove cleanly on equip/unequip from the map screen

### Dungeon
- 12 rooms in a directed acyclic graph (DAG) — multiple paths to the final boss
- Multi-encounter rooms (some rooms have 2 waves; clear both to advance)
- Encounter difficulty rating (Easy / Medium / Hard / Deadly) based on level delta and HP
- SVG minimap with fog-of-war: visited (green), current (orange), available (amber), unknown

### Content
| Category | Count |
|---|---|
| Playable classes | 5 |
| Enemy types | 26 |
| Skills | 30 |
| Equipment pieces | 31 |
| Dungeon rooms | 12 |
| Enemy AI roles | 7 |

---

## File Structure

```
src/
  main.ts                      # Entry point — init engine, scene, session
  game/
    Game.ts                    # State machine orchestrator
    stateMachine.ts            # FSM: TITLE / MAP / EVENT / COMBAT / REWARD / DEFEAT
    session/
      GameSession.ts           # Run state — wires all screens, handles transitions
  rules/
    types.ts                   # Pure types: Character, Enemy, StatusEffect, etc.
    combat.ts                  # Turn-based combat engine (no Babylon imports)
    enemyAI.ts                 # 7 AI roles with targeting and behavior trees
    leveling.ts                # XP award and level-up stat/skill growth
    log.ts                     # Combat event log
    dice.ts                    # Dice roller: NdM+K expression parser
  render/
    createScene.ts             # Babylon.js scene: diorama board, lighting, camera
    CombatRenderer.ts          # Unit meshes, attack animations, spell particles
  ui/
    createCombatUI.ts          # In-combat DOM overlay: HP bars, skill buttons, log
    CombatUIController.ts      # Bridges combat engine ↔ UI ↔ renderer
    screens/
      MainMenuScreen.ts        # Title / new game
      PartySelectScreen.ts     # Class picker (choose 3 of 5)
      DungeonMapScreen.ts      # Between-combat hub: minimap, party, equipment
      EventScreen.ts           # Pre-combat room preview
      RewardScreen.ts          # Post-combat XP / loot / level-up
      DefeatScreen.ts          # Run-over summary
      CharacterDetailPanel.ts  # Per-character stats, equipment, and skills overlay
      InventoryScreen.ts       # Out-of-combat item use with target selection
  content/
    loaders/
      index.ts                 # Content loader and character factory
      types.ts                 # Content type definitions
    classes.json               # 5 class templates (stats, growth, skills)
    enemies.json               # 26 enemy templates (AI role, stats, skills, drops)
    skills.json                # 30 skills with targeting, damage, and status effects
    items.json                 # Consumable items
    equipment.json             # 31 equipment pieces with rarity and class restrictions
    rooms.json                 # 12 rooms with branching connections and drop tables
    encounters.json            # Encounter wave definitions per room
```

---

## Architecture Notes

- **No circular imports**: `rules/` → `types.ts` only. `render/` and `ui/` import from `rules/` but not vice-versa.
- **Synchronous state dispatch**: `game.dispatch()` calls `onStateChangeCallback` synchronously. Screen state reads happen before any resets — see `GameSession.onCombatEnd` defeat path.
- **Equipment bonuses**: Applied to live stats on equip, reversed on unequip. The truthiness guard (`if (bonus)`) means 0-value entries are skipped — all current equipment has nonzero bonuses.
- **Attack item buff cap**: `Character.attackBuff` tracks cumulative item-granted ATK. Capped at +20 per run to prevent strength-tonic stacking.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank screen | Use `npm run dev`, not `index.html` directly (CORS) |
| Console errors on start | Check `src/content/*.json` for malformed data |
| Port conflict | Vite auto-selects the next available port |
| Black 3D viewport | WebGL may be disabled; try Chrome or Firefox |
