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

### Phase 6 — Crimson Shroud Combat Redesign
- Individual speed-based turn order: each combatant (party + enemy) acts in speed-sorted order per round
- Turn order bar in combat UI showing upcoming actors with active-turn highlight
- Bonus dice pool: shared party resource (max 10), earned from element chains, spent on any attack roll
- Element system: 6 element types (fire, ice, lightning, earth, holy, dark) on skills
- Element chain / Gift mechanic: consecutive same-element attacks build a chain multiplier (1.25×, 1.5×, 2.0×) and award bonus dice
- Elemental weakness/resistance on enemies: weakness = 1.5× damage, resistance = 0.5× damage
- Dice roll visualization: individual die faces shown in combat log
- Enemy AI updated for individual turn model (acts on its own turn, not in batch)
- CombatUIController rewritten for per-actor flow with auto-advancing enemy turns

### Phase 7 — Narrative Events
- Non-combat room events: 4 narrative event types (shrine, merchant, trap corridor, hidden treasury)
- Choice-based event UI with 3–4 options per event, descriptions, and gold cost indicators
- Probabilistic outcomes: weighted random selection from multiple possible results per choice
- Event effects: gold gain/loss, HP healing (flat or full), damage, MP restore, item grants, status effects
- 4 new dungeon rooms (16 total): Forgotten Shrine, Merchant's Alcove, Trapped Corridor, Hidden Treasury
- State machine extended with `COMPLETE_EVENT` transition (`EVENT → MAP`) for non-combat resolution
- EventScreen dual-mode: combat preview (orange) vs. narrative choices (blue) with outcome display

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

### Performance Fixes Applied
- **CombatRenderer material/texture disposal** — `clear()` now uses `dispose(false, true)` to dispose materials and textures with meshes, preventing GPU memory leaks across combats
- **Particle system tracking** — active particle systems tracked via `Set` and force-disposed on `clear()`, preventing orphaned particles when combat ends mid-animation
- **Old renderer cleanup** — `GameSession.startCombatEncounter` now calls `clear()` on the previous renderer before creating a new one
- **Combat status deduplication** — replaced `hasStatus()` + `.find()` double-lookup pattern with single `getStatus()` call (5 sites in `combat.ts`)
- **CSS hover replacement** — combat UI button hover effects moved from per-render JS listeners to a single `<style>` tag with `:hover` pseudo-class

---

## In Progress

- (Nothing actively in progress — clean state for next phase)

---

## Planned

### Next — Phase 8: Game Feel
- [ ] Sound effects: attack hit, spell cast, level-up, enemy death, door open
- [ ] Ambient dungeon music (looping, mood-matched per zone)
- [ ] Screen transitions: fade/slide between MAP → EVENT → COMBAT
- [ ] Combat camera: zoom to active unit during its action
- [ ] Damage floater numbers above units
- [ ] Idle animations for party and enemy meshes

### Phase 9: Settings & Accessibility
- [ ] Settings panel: master volume, music volume, SFX volume
- [ ] Text size options (small / normal / large)
- [ ] Color-blind mode (recolor status/rarity indicators)
- [ ] Keyboard rebinding (via keybindings config)
- [ ] Skip animations toggle

### Phase 10: Save & Persistence
- [ ] `localStorage` save slot: persist run-in-progress across page refresh
- [ ] Multiple save slots (up to 3 runs)
- [ ] Run history: show last 5 completed/failed runs with stats
- [ ] Bestiary: track which enemies have been fought

### Phase 11: Roguelite Layer
- [ ] Unlockable classes (start locked, unlock by achieving certain conditions)
- [ ] Meta-upgrades: persistent gold bank, buy starting bonuses between runs
- [ ] Difficulty tiers: Normal / Hard / Nightmare (enemy stat scaling)
- [ ] Daily run seed: share a seed string, compare scores on a leaderboard
- [ ] Achievements: first clear, no-death run, all-class run, speed run

### Phase 12: Content Expansion
- [ ] 3 more classes: Bard (group buffs), Necromancer (summons), Monk (unarmored tanking)
- [ ] 2 additional dungeons: Ice Citadel, Volcanic Depths — each 10–14 rooms
- [ ] Boss-only challenge mode: 5-boss gauntlet, no map screen between
- [ ] 20+ new enemy types (aquatic, construct, infernal themes)
- [ ] Dual-boss final encounters (two bosses act together)
- [ ] Crafting: combine dropped materials to forge equipment

### Phase 13: Mobile & Deployment
- [ ] Responsive layout for portrait phone screens
- [ ] Touch controls: tap to select, swipe combat log
- [ ] PWA manifest for "Add to Home Screen" install
- [ ] Vercel / Netlify auto-deploy from `main`
- [ ] Public leaderboard via serverless function

---

## Known Limitations (Not Bugs, But Tradeoffs)

| Area | Current Behavior | Future Improvement |
|---|---|---|
| Dead party members | Stay dead for the run; no revive items | Add revive mechanics (Phoenix Down-style) in a future phase |
| Enemy skill targeting | Boss `war-cry` uses `all_allies`; `targetId` is ignored | Full skill animation routing per targeting type |
| Equipment bonus precision | Truthiness guard skips 0-value bonuses | Explicit `!== undefined` check if 0-value items are ever added |
| Buff items in combat | Items with `type: buff` permanently raise `char.attack` (capped at +20) | Track as a timed status in a future phase |
