# Dungeon Roll — Roadmap

Track of what's done and what comes next.

---

## Completed

### Phase 1 — Foundation
- Babylon.js scene: diorama board, isometric camera, dynamic lighting
- Finite state machine: `TITLE → MAP → EVENT → COMBAT → REWARD → MAP` (+ `DEFEAT`)
- Clean architecture: `rules/` has zero Babylon imports; fully unit-testable
- Data-driven content system (`src/content/*.json`)
- Dice roller: `NdM+K` expression parser (`2d6+3`, `1d8`, etc.)

### Phase 2 — Rules Engine
- Full turn-based combat: speed-ordered initiative, attack, guard (doubles armor)
- Status effects: poison, stun, buff, weaken, shield, regenerate (with duration)
- Skill system: 30 skills across 5 classes, with targeting, MP cost, dice expressions, scaling
- Item system: in-combat use of potions, ethers, antidotes, strength tonics
- XP and leveling: split XP, per-class stat growth, skill unlock on level-up

### Phase 3 — Combat UI & 3D Rendering
- Interactive combat overlay: HP/MP bars, skill buttons (1–4 keyboard shortcuts), item panel
- Scrollable combat log with color-coded events
- `CombatRenderer`: 3D unit meshes for party and enemies
- Attack animations (melee sweep), spell particle effects, death animations
- Guard visual indicator on unit mesh

### Phase 4 — RPG Foundation
- 5 playable classes: Knight, Mage, Ranger, Cleric, Rogue (unique stats, skills, growth)
- 26 enemy types organized by role across 12 dungeon rooms
- 7 enemy AI roles: basic, tank, bruiser, caster, healer, sniper, boss
  - Healer targets wounded allies; boss enrages below 40% HP; sniper focuses squishies
- 31 equipment pieces: weapon / armor / accessory, 3 rarities, class restrictions
- Branching 12-room dungeon as a DAG — multiple paths to the final boss
- Multi-wave encounters: some rooms have 2 encounters (clear both to advance)
- Equipment drop system: room `dropTable` with rarity-weighted chances

### Phase 5 — UI Screens & Polish
- `DungeonMapScreen`: party status, gold, rest, equipment management, path selection
- SVG dungeon minimap: BFS layout, fog-of-war (visited/current/available/unknown)
- `CharacterDetailPanel`: full stats with equipment bonus breakdown, skills, equipment
- `InventoryScreen`: item list with two-phase USE → target-select flow
- `DefeatScreen`: run summary (rooms cleared, room of death, gold earned) — fixed to read correct live state
- Encounter counter for multi-wave rooms (Encounter 1/2, 2/2)
- Difficulty label per encounter (Easy / Medium / Hard / Deadly)

### Bug Fixes Applied
- **Defeat screen data** — state was reset before `dispatch('LOSE_COMBAT')`; fixed ordering
- **`awardXp` type cast** — changed from `as any` to proper `Map<CharacterClass, ClassTemplate>`
- **Buff stacking** — strength-tonic attack bonus now tracked via `Character.attackBuff`, capped at +20/run
- **Empty encounter modulo** — `showEventScreen` and `startCombatEncounter` guard against `room.encounters.length === 0`
- **Minimap `Math.max` spread** — guarded against empty `depth.values()` iterator
- **Equipment bonus asymmetry** — `removeEquipmentBonuses` now subtracts the HP/MP bonus (not just clamps), so equip→damage→unequip→re-equip no longer causes permanent stat loss. Unequipping cannot kill (floor of 1 HP)
- **`awardXp` division by zero** — early return when 0 alive party members prevents `Math.floor(xp / 0)` → `Infinity` XP
- **Level-up HP/MP cap** — growth is now capped at maxHp/maxMp via `Math.min` to prevent exceeding maximum
- **Enemy AI dead-target fallback** — when all party dead, enemy AI now guards instead of attacking a dead target
- **`pickRandom`/`pickWeakest` empty-array guard** — both throw explicit errors on empty arrays instead of silently returning `undefined`

---

## In Progress

- (Nothing actively in progress — clean state for next phase)

---

## Planned

### Next — Phase 6: Game Feel
- [ ] Sound effects: attack hit, spell cast, level-up, enemy death, door open
- [ ] Ambient dungeon music (looping, mood-matched per zone)
- [ ] Screen transitions: fade/slide between MAP → EVENT → COMBAT
- [ ] Combat camera: zoom to active unit during its action
- [ ] Damage floater numbers above units
- [ ] Idle animations for party and enemy meshes

### Phase 7: Narrative Events
- [ ] Non-combat room events: treasure chests, merchants, shrines, traps, lore scrolls
- [ ] Random event pool per room type (3 possible outcomes per trigger)
- [ ] Merchant NPC: buy/sell items and equipment with gold
- [ ] Shrine: trade HP for a stat boost, or pray for a random blessing
- [ ] Trap rooms: skill check to disarm or take party damage

### Phase 8: Settings & Accessibility
- [ ] Settings panel: master volume, music volume, SFX volume
- [ ] Text size options (small / normal / large)
- [ ] Color-blind mode (recolor status/rarity indicators)
- [ ] Keyboard rebinding (via keybindings config)
- [ ] Skip animations toggle

### Phase 9: Save & Persistence
- [ ] `localStorage` save slot: persist run-in-progress across page refresh
- [ ] Multiple save slots (up to 3 runs)
- [ ] Run history: show last 5 completed/failed runs with stats
- [ ] Bestiary: track which enemies have been fought

### Phase 10: Roguelite Layer
- [ ] Unlockable classes (start locked, unlock by achieving certain conditions)
- [ ] Meta-upgrades: persistent gold bank, buy starting bonuses between runs
- [ ] Difficulty tiers: Normal / Hard / Nightmare (enemy stat scaling)
- [ ] Daily run seed: share a seed string, compare scores on a leaderboard
- [ ] Achievements: first clear, no-death run, all-class run, speed run

### Phase 11: Content Expansion
- [ ] 3 more classes: Bard (group buffs), Necromancer (summons), Monk (unarmored tanking)
- [ ] 2 additional dungeons: Ice Citadel, Volcanic Depths — each 10–14 rooms
- [ ] Boss-only challenge mode: 5-boss gauntlet, no map screen between
- [ ] 20+ new enemy types (aquatic, construct, infernal themes)
- [ ] Dual-boss final encounters (two bosses act together)
- [ ] Crafting: combine dropped materials to forge equipment

### Phase 12: Mobile & Deployment
- [ ] Responsive layout for portrait phone screens
- [ ] Touch controls: tap to select, swipe combat log
- [ ] PWA manifest for "Add to Home Screen" install
- [ ] Vercel / Netlify auto-deploy from `main`
- [ ] Public leaderboard via serverless function

---

## Known Limitations (Not Bugs, But Tradeoffs)

| Area | Current Behavior | Future Improvement |
|---|---|---|
| Dead party members | Stay dead for the run; no revive items | Add revive mechanics (Phoenix Down-style) in Phase 7 |
| Enemy skill targeting | Boss `war-cry` uses `all_allies`; `targetId` is ignored | Full skill animation routing per targeting type |
| Equipment bonus precision | Truthiness guard skips 0-value bonuses | Explicit `!== undefined` check if 0-value items are ever added |
| Event listener cleanup | Combat UI buttons re-attached on each render | Refactor to use event delegation in Phase 8 |
| Buff items in combat | Items with `type: buff` permanently raise `char.attack` | Track as a timed status in Phase 6 |
