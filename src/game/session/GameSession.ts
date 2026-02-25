import * as BABYLON from 'babylonjs';
import { Game } from '../Game';
import { GameState } from '../stateMachine';
import { CombatLog } from '../../rules/log';
import { CombatEngine } from '../../rules/combat';
import { createCombatUI, CombatUI } from '../../ui/createCombatUI';
import { CombatUIController } from '../../ui/CombatUIController';
import { CombatRenderer } from '../../render/CombatRenderer';
import { GameContent, RoomTemplate, EquipmentTemplate } from '../../content/loaders/types';
import { Character, Enemy, CharacterClass } from '../../rules/types';
import { createEncounterFromRoom, createCharacterFromClass } from '../../content/loaders';
import { awardXp, LevelUpResult } from '../../rules/leveling';
import { createMainMenuScreen, MainMenuScreen } from '../../ui/screens/MainMenuScreen';
import { createDungeonMapScreen, DungeonMapScreen, DungeonRoomInfo } from '../../ui/screens/DungeonMapScreen';
import { createRewardScreen, RewardScreen, RewardData, RewardLevelUp } from '../../ui/screens/RewardScreen';
import { createDefeatScreen, DefeatScreen, DefeatData } from '../../ui/screens/DefeatScreen';
import { createPartySelectScreen, PartySelectScreen, PartyClassInfo } from '../../ui/screens/PartySelectScreen';
import { createEventScreen, EventScreen } from '../../ui/screens/EventScreen';
import { createCharacterDetailPanel, CharacterDetailPanel, CharacterDetailData } from '../../ui/screens/CharacterDetailPanel';
import { createInventoryScreen, InventoryScreen, InventoryData } from '../../ui/screens/InventoryScreen';

export interface GameSessionConfig {
  scene: BABYLON.Scene;
  content: GameContent;
  onStateChange?: (state: GameState) => void;
}

const REST_COST = 20;
const STARTING_ROOM = 'entry-hall';

export class GameSession {
  private readonly game: Game;
  private readonly scene: BABYLON.Scene;
  private readonly onStateChangeCallback?: (state: GameState) => void;
  private readonly content: GameContent;

  // Screen UIs
  private mainMenu: MainMenuScreen;
  private partySelectScreen: PartySelectScreen;
  private dungeonMap: DungeonMapScreen;
  private eventScreen: EventScreen;
  private rewardScreen: RewardScreen;
  private defeatScreen: DefeatScreen;
  private characterDetail: CharacterDetailPanel;
  private inventoryScreen: InventoryScreen;
  private combatUI?: CombatUI;
  private combatController?: CombatUIController;
  private combatRenderer?: CombatRenderer;

  // Game state
  private persistentParty: Character[] | null = null;
  private currentRoomId: string = STARTING_ROOM;
  private currentEncounterIndex: number = 0;
  private visitedRoomIds: string[] = [];
  private pendingRewardData: RewardData | null = null;
  private gold: number = 0;
  private _foundEquipment: string[] = [];

  constructor(config: GameSessionConfig) {
    this.scene = config.scene;
    this.content = config.content;
    this.onStateChangeCallback = config.onStateChange;

    this.game = new Game({
      onStateChange: (state) => this.handleStateChange(state),
    });

    // Create screen UIs
    this.mainMenu = createMainMenuScreen();
    this.partySelectScreen = createPartySelectScreen();
    this.dungeonMap = createDungeonMapScreen();
    this.eventScreen = createEventScreen();
    this.rewardScreen = createRewardScreen();
    this.defeatScreen = createDefeatScreen();
    this.characterDetail = createCharacterDetailPanel();
    this.inventoryScreen = createInventoryScreen();

    this.wireScreenCallbacks();
  }

  private wireScreenCallbacks(): void {
    this.mainMenu.onNewGame(() => {
      this.showPartySelect();
    });

    this.partySelectScreen.onConfirm((selectedClassIds) => {
      this.partySelectScreen.hide();
      this.persistentParty = selectedClassIds.map((classId, index) => {
        const classTemplate = this.content.classes.get(classId as CharacterClass);
        if (!classTemplate) throw new Error(`Unknown class: ${classId}`);
        return createCharacterFromClass(classTemplate, index);
      });
      this.gold = 0;
      this.currentRoomId = STARTING_ROOM;
      this.currentEncounterIndex = 0;
      this.visitedRoomIds = [];
      this._foundEquipment = [];
      this.game.dispatch('START_RUN');
    });

    this.dungeonMap.onEnterRoom(() => {
      this.game.dispatch('ENTER_ROOM');
    });

    this.dungeonMap.onDungeonComplete(() => {
      this.persistentParty = null;
      this.gold = 0;
      this.currentRoomId = STARTING_ROOM;
      this.currentEncounterIndex = 0;
      this.visitedRoomIds = [];
      this._foundEquipment = [];
      this.game.reset();
    });

    this.dungeonMap.onRest(() => {
      if (this.gold >= REST_COST && this.persistentParty) {
        this.gold -= REST_COST;
        for (const char of this.persistentParty) {
          if (char.hp > 0) {
            char.hp = Math.min(char.maxHp, char.hp + Math.floor(char.maxHp * 0.5));
            char.mp = Math.min(char.maxMp, char.mp + Math.floor(char.maxMp * 0.5));
          }
        }
        this.showDungeonMap();
      }
    });

    this.dungeonMap.onChooseRoom((roomId: string) => {
      this.currentRoomId = roomId;
      this.currentEncounterIndex = 0;
      this.showDungeonMap();
    });

    this.dungeonMap.onEquip((charIndex: number, equipmentId: string) => {
      const char = this.persistentParty?.[charIndex];
      if (!char) return;
      const tmpl = this.content.equipment.get(equipmentId);
      if (!tmpl) return;
      if (tmpl.classRestriction.length > 0 && !tmpl.classRestriction.includes(char.characterClass)) return;
      // Remove existing item in same slot (return bonuses)
      const oldEquip = char.equipment.find(e => e.slot === tmpl.slot);
      if (oldEquip) {
        const oldTmpl = this.content.equipment.get(oldEquip.equipmentId);
        if (oldTmpl) this.removeEquipmentBonuses(char, oldTmpl);
      }
      char.equipment = char.equipment.filter(e => e.slot !== tmpl.slot);
      char.equipment.push({ equipmentId: tmpl.id, slot: tmpl.slot });
      this.applyEquipmentBonuses(char, tmpl);
      this.showDungeonMap();
    });

    this.dungeonMap.onUnequip((charIndex: number, slot: string) => {
      const char = this.persistentParty?.[charIndex];
      if (!char) return;
      const existing = char.equipment.find(e => e.slot === slot);
      if (existing) {
        const tmpl = this.content.equipment.get(existing.equipmentId);
        if (tmpl) this.removeEquipmentBonuses(char, tmpl);
      }
      char.equipment = char.equipment.filter(e => e.slot !== slot);
      this.showDungeonMap();
    });

    this.dungeonMap.onViewCharacter((charIndex: number) => {
      this.showCharacterDetail(charIndex);
    });

    this.dungeonMap.onOpenInventory(() => {
      this.showInventory();
    });

    this.characterDetail.onClose(() => {
      this.characterDetail.hide();
    });

    this.inventoryScreen.onClose(() => {
      this.inventoryScreen.hide();
    });

    this.inventoryScreen.onUseItem((itemId: string, charIndex: number) => {
      this.useItem(itemId, charIndex);
    });

    this.eventScreen.onProceed(() => {
      this.game.dispatch('RESOLVE_EVENT');
    });

    this.rewardScreen.onContinue(() => {
      this.game.dispatch('CLAIM_REWARD');
    });

    this.defeatScreen.onReturnToTitle(() => {
      this.persistentParty = null;
      this.gold = 0;
      this.currentRoomId = STARTING_ROOM;
      this.currentEncounterIndex = 0;
      this.visitedRoomIds = [];
      this._foundEquipment = [];
      this.game.reset();
    });
  }

  start(): void {
    this.handleStateChange(this.game.getCurrentState());
  }

  getCurrentState(): GameState {
    return this.game.getCurrentState();
  }

  private showPartySelect(): void {
    this.mainMenu.hide();
    const classInfos: PartyClassInfo[] = [];
    for (const [, cls] of this.content.classes) {
      classInfos.push({
        id: cls.id,
        name: cls.name,
        role: '',
        hp: cls.baseHp,
        mp: cls.baseMp,
        attack: cls.baseAttack,
        armor: cls.baseArmor,
        speed: cls.baseSpeed,
        skills: cls.startingSkills
          .filter(id => id !== 'basic-attack')
          .map(id => this.content.skills.get(id)?.name ?? id),
        color: '',
      });
    }
    this.partySelectScreen.show(classInfos);
  }

  private handleStateChange(state: GameState): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }

    this.hideAllScreens();

    switch (state) {
      case 'TITLE':
        this.mainMenu.show();
        break;
      case 'MAP':
        this.showDungeonMap();
        break;
      case 'EVENT':
        this.showEventScreen();
        break;
      case 'COMBAT':
        this.startCombatEncounter();
        break;
      case 'REWARD':
        this.showRewardScreen();
        break;
      case 'DEFEAT': {
        const room = this.content.rooms.get(this.currentRoomId);
        const defeatData: DefeatData = {
          roomsCleared: this.visitedRoomIds.length,
          totalRooms: this.content.rooms.size,
          goldEarned: this.gold,
          roomName: room?.name ?? 'Unknown',
        };
        this.defeatScreen.show(defeatData);
        break;
      }
    }
  }

  private hideAllScreens(): void {
    this.mainMenu.hide();
    this.partySelectScreen.hide();
    this.dungeonMap.hide();
    this.eventScreen.hide();
    this.rewardScreen.hide();
    this.defeatScreen.hide();
    this.characterDetail.hide();
    this.inventoryScreen.hide();
    this.hideCombat();
  }

  private showDungeonMap(): void {
    const room = this.content.rooms.get(this.currentRoomId);
    const roomCleared = room ? this.currentEncounterIndex >= room.encounters.length : true;

    const encounterIndex = room && !roomCleared ? this.currentEncounterIndex : 0;
    const encounter = room?.encounters[encounterIndex];

    const encounterPreview: string[] = [];
    let encounterTotalHp = 0;
    if (encounter && !roomCleared) {
      for (const enemyId of encounter.enemyIds) {
        const template = this.content.enemies.get(enemyId);
        if (template) {
          encounterPreview.push(template.name);
          encounterTotalHp += template.hp;
        }
      }
    }

    const party = this.persistentParty ?? [];

    // Build next room choices for branching
    const nextRoomChoices: { id: string; name: string; recommendedLevel: number; description: string }[] = [];
    if (roomCleared && room) {
      for (const nextId of room.nextRooms) {
        const r = this.content.rooms.get(nextId);
        if (r) {
          nextRoomChoices.push({ id: r.id, name: r.name, recommendedLevel: r.recommendedLevel, description: r.description });
        }
      }
    }

    const dungeonComplete = roomCleared && nextRoomChoices.length === 0 && this.visitedRoomIds.length > 0;

    // Build room connection graph for minimap
    const roomConnections: { from: string; to: string }[] = [];
    for (const [, r] of this.content.rooms) {
      for (const nextId of r.nextRooms) {
        roomConnections.push({ from: r.id, to: nextId });
      }
    }

    // Collect party equipment info and available pool
    const partyEquipment = party.map(c => {
      const equipped: Record<string, { id: string; name: string; rarity: string }> = {};
      for (const eq of c.equipment) {
        const tmpl = this.content.equipment.get(eq.equipmentId);
        if (tmpl) equipped[eq.slot] = { id: tmpl.id, name: tmpl.name, rarity: tmpl.rarity };
      }
      return equipped;
    });

    const equippedIds = new Set<string>();
    for (const char of party) {
      for (const eq of char.equipment) equippedIds.add(eq.equipmentId);
    }

    const availableEquipment = this._foundEquipment
      .filter(id => !equippedIds.has(id))
      .map(id => {
        const tmpl = this.content.equipment.get(id);
        if (!tmpl) return null;
        return {
          id: tmpl.id, name: tmpl.name, slot: tmpl.slot, rarity: tmpl.rarity,
          description: tmpl.description,
          bonuses: { ...tmpl.bonuses } as Record<string, number>,
          classRestriction: [...tmpl.classRestriction],
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    this.dungeonMap.show({
      rooms: this.getAllRoomInfos(),
      currentRoomId: this.currentRoomId,
      visitedRoomIds: this.visitedRoomIds,
      roomConnections,
      encounterIndex: roomCleared ? 0 : this.currentEncounterIndex,
      totalEncounters: room?.encounters.length ?? 1,
      party: party.map(c => ({
        name: c.name,
        characterClass: c.characterClass,
        hp: c.hp,
        maxHp: c.maxHp,
        mp: c.mp,
        maxMp: c.maxMp,
        level: c.level,
        xp: c.xp,
        xpToNext: c.xpToNext,
      })),
      encounterPreview,
      encounterTotalHp,
      gold: this.gold,
      restCost: REST_COST,
      nextRoomChoices,
      roomCleared,
      dungeonComplete,
      partyEquipment,
      availableEquipment,
    });
  }

  private getAllRoomInfos(): DungeonRoomInfo[] {
    const result: DungeonRoomInfo[] = [];
    for (const [, room] of this.content.rooms) {
      result.push({
        id: room.id,
        name: room.name,
        description: room.description,
        recommendedLevel: room.recommendedLevel,
      });
    }
    return result;
  }

  private showEventScreen(): void {
    const room = this.content.rooms.get(this.currentRoomId);
    if (!room || room.encounters.length === 0) return;

    const encounterIndex = this.currentEncounterIndex % room.encounters.length;
    const encounter = room.encounters[encounterIndex];
    const encounterPreview: string[] = [];
    if (encounter) {
      for (const enemyId of encounter.enemyIds) {
        const template = this.content.enemies.get(enemyId);
        if (template) encounterPreview.push(template.name);
      }
    }

    this.eventScreen.show({
      roomName: room.name,
      roomDescription: room.description,
      encounterPreview,
      roomIndex: this.visitedRoomIds.length,
      totalRooms: this.content.rooms.size,
      flavorText: '',
    });
  }

  private startCombatEncounter(): void {
    const room = this.content.rooms.get(this.currentRoomId);
    if (!room) {
      console.error('No room found for current id:', this.currentRoomId);
      return;
    }
    if (room.encounters.length === 0) {
      console.error('Room has no encounters:', this.currentRoomId);
      return;
    }

    const encounterIndex = this.currentEncounterIndex % room.encounters.length;
    const encounter = room.encounters[encounterIndex];

    const setup = createEncounterFromRoom(this.content, room.id, encounter.id);
    const party = this.persistentParty ?? setup.party;
    if (!this.persistentParty) {
      this.persistentParty = party;
    }

    const enemies = setup.enemies;

    const combatLog = new CombatLog();
    combatLog.add(`=== ${room.name}: ${room.description} ===`);
    combatLog.add(`Encounter: ${enemies.map(e => e.name).join(', ')}`);
    combatLog.add('');

    const combatEngine = new CombatEngine(party, enemies, combatLog, this.content);

    if (!this.combatUI) {
      this.combatUI = createCombatUI();
    }

    // Dispose previous renderer to prevent material/particle leaks
    if (this.combatRenderer) {
      this.combatRenderer.clear();
    }

    const combatRenderer = new CombatRenderer(this.scene);
    this.combatRenderer = combatRenderer;
    combatRenderer.createPartyMeshes(party);
    combatRenderer.createEnemyMeshes(enemies);

    this.combatController = new CombatUIController(
      combatEngine,
      combatLog,
      this.combatUI,
      party,
      enemies,
      this.content,
      combatRenderer,
      (victor) => this.onCombatEnd(victor, party, enemies, room),
      this.gold
    );

    this.combatController.startTurn();
    this.combatController.show();
  }

  private onCombatEnd(
    victor: 'party' | 'enemy',
    party: Character[],
    enemies: Enemy[],
    room: RoomTemplate
  ): void {
    if (victor === 'party') {
      const totalXp = enemies.reduce((sum, e) => sum + e.xpReward, 0);
      const totalGold = enemies.reduce((sum, e) => sum + e.goldReward, 0);
      this.gold += totalGold;
      const levelUps = awardXp(party, totalXp, this.content.classes);

      const itemDrops = this.generateItemDrops(enemies);
      if (itemDrops.length > 0) {
        const receiver = party.find(c => c.hp > 0) ?? party[0];
        for (const drop of itemDrops) {
          const existing = receiver.inventory.find(e => e.itemId === drop.itemId);
          if (existing) {
            existing.quantity += drop.quantity;
          } else {
            receiver.inventory.push({ itemId: drop.itemId, quantity: drop.quantity });
          }
        }
      }

      const equipDrops = this.generateEquipmentDrops(room);

      const rewardLevelUps: RewardLevelUp[] = levelUps.map((lu: LevelUpResult) => ({
        characterName: lu.character.name,
        oldLevel: lu.oldLevel,
        newLevel: lu.newLevel,
        hpGain: lu.hpGain,
        mpGain: lu.mpGain,
        attackGain: lu.attackGain,
        armorGain: lu.armorGain,
        speedGain: lu.speedGain,
        newSkills: lu.newSkills.map(id => this.content.skills.get(id)?.name ?? id),
      }));

      this.pendingRewardData = {
        xpEarned: totalXp,
        goldEarned: totalGold,
        levelUps: rewardLevelUps,
        itemDrops: itemDrops.map(d => ({ name: d.name, quantity: d.quantity })),
        equipmentDrops: equipDrops.map(e => ({ name: e.name, rarity: e.rarity })),
        party: party.map(c => ({
          name: c.name,
          hp: c.hp,
          maxHp: c.maxHp,
          mp: c.mp,
          maxMp: c.maxMp,
          level: c.level,
          xp: c.xp,
          xpToNext: c.xpToNext,
        })),
        roomName: room.name,
      };

      for (const char of party) {
        char.statuses = [];
        char.isGuarding = false;
      }

      this.currentEncounterIndex++;
      if (this.currentEncounterIndex >= room.encounters.length) {
        if (!this.visitedRoomIds.includes(room.id)) {
          this.visitedRoomIds.push(room.id);
        }
      }

      this.game.dispatch('WIN_COMBAT');
    } else {
      // Don't reset navigation state yet — handleStateChange('DEFEAT') reads it
      // to build the defeat summary. State resets happen in defeatScreen.onReturnToTitle.
      this.persistentParty = null;
      this.game.dispatch('LOSE_COMBAT');
    }
  }

  private generateItemDrops(enemies: Enemy[]): { itemId: string; name: string; quantity: number }[] {
    const drops = new Map<string, number>();
    const addDrop = (itemId: string, qty: number) => {
      drops.set(itemId, (drops.get(itemId) ?? 0) + qty);
    };

    for (const enemy of enemies) {
      const n = enemy.name.toLowerCase();
      if (n.includes('goblin') || n.includes('wolf') || n.includes('bat') || n.includes('bandit')) {
        if (Math.random() < 0.3) addDrop('small-potion', 1);
      }
      if (n.includes('mage') || n.includes('shaman') || n.includes('sorcerer') || n.includes('necromancer') || n.includes('wraith') || n.includes('acolyte')) {
        if (Math.random() < 0.4) addDrop('ether', 1);
      }
      if (n.includes('skeleton') || n.includes('undead') || n.includes('lich') || n.includes('spider')) {
        if (Math.random() < 0.2) addDrop('antidote', 1);
      }
      if (enemy.maxHp >= 60) {
        if (Math.random() < 0.5) addDrop('medium-potion', 1);
        if (Math.random() < 0.25) addDrop('strength-tonic', 1);
      }
      if (n.includes('dragon')) {
        if (Math.random() < 0.6) addDrop('large-potion', 1);
        if (Math.random() < 0.4) addDrop('mega-ether', 1);
      }
    }

    return Array.from(drops.entries()).map(([itemId, quantity]) => ({
      itemId,
      name: this.content.items.get(itemId)?.name ?? itemId,
      quantity,
    }));
  }

  private generateEquipmentDrops(room: RoomTemplate): { id: string; name: string; rarity: string }[] {
    const drops: { id: string; name: string; rarity: string }[] = [];
    if (room.dropTable.length === 0) return drops;

    for (const equipId of room.dropTable) {
      const tmpl = this.content.equipment.get(equipId);
      if (!tmpl) continue;
      if (this._foundEquipment.includes(equipId)) continue;

      let dropChance = 0.15;
      if (tmpl.rarity === 'uncommon') dropChance = 0.10;
      if (tmpl.rarity === 'rare') dropChance = 0.06;

      if (Math.random() < dropChance) {
        this._foundEquipment.push(equipId);
        drops.push({ id: tmpl.id, name: tmpl.name, rarity: tmpl.rarity });
      }
    }

    return drops;
  }

  private applyEquipmentBonuses(char: Character, tmpl: EquipmentTemplate): void {
    if (tmpl.bonuses.hp) { char.maxHp += tmpl.bonuses.hp; char.hp += tmpl.bonuses.hp; }
    if (tmpl.bonuses.mp) { char.maxMp += tmpl.bonuses.mp; char.mp += tmpl.bonuses.mp; }
    if (tmpl.bonuses.attack) char.attack += tmpl.bonuses.attack;
    if (tmpl.bonuses.armor) char.armor += tmpl.bonuses.armor;
    if (tmpl.bonuses.speed) char.speed += tmpl.bonuses.speed;
  }

  private removeEquipmentBonuses(char: Character, tmpl: EquipmentTemplate): void {
    if (tmpl.bonuses.hp) { char.maxHp -= tmpl.bonuses.hp; char.hp = Math.max(1, Math.min(char.hp - tmpl.bonuses.hp, char.maxHp)); }
    if (tmpl.bonuses.mp) { char.maxMp -= tmpl.bonuses.mp; char.mp = Math.max(0, Math.min(char.mp - tmpl.bonuses.mp, char.maxMp)); }
    if (tmpl.bonuses.attack) char.attack -= tmpl.bonuses.attack;
    if (tmpl.bonuses.armor) char.armor -= tmpl.bonuses.armor;
    if (tmpl.bonuses.speed) char.speed -= tmpl.bonuses.speed;
  }

  private showCharacterDetail(charIndex: number): void {
    const char = this.persistentParty?.[charIndex];
    if (!char) return;

    // Compute equipment bonuses
    const equipmentBonuses: Record<string, number> = {};
    const equipmentDetails: CharacterDetailData['equipment'] = [];
    for (const eq of char.equipment) {
      const tmpl = this.content.equipment.get(eq.equipmentId);
      if (tmpl) {
        for (const [stat, value] of Object.entries(tmpl.bonuses)) {
          if (value) equipmentBonuses[stat] = (equipmentBonuses[stat] ?? 0) + value;
        }
        equipmentDetails.push({
          slot: tmpl.slot,
          name: tmpl.name,
          rarity: tmpl.rarity,
          description: tmpl.description,
          bonuses: { ...tmpl.bonuses } as Record<string, number>,
        });
      }
    }

    // Build skill list
    const skills = char.skillIds
      .filter(id => id !== 'basic-attack')
      .map(id => {
        const tmpl = this.content.skills.get(id);
        return {
          name: tmpl?.name ?? id,
          description: tmpl?.description ?? '',
          mpCost: tmpl?.mpCost ?? 0,
          targeting: tmpl?.targeting ?? 'single_enemy',
        };
      });

    this.characterDetail.show({
      name: char.name,
      characterClass: char.characterClass,
      level: char.level,
      hp: char.hp,
      maxHp: char.maxHp,
      mp: char.mp,
      maxMp: char.maxMp,
      attack: char.attack,
      armor: char.armor,
      speed: char.speed,
      xp: char.xp,
      xpToNext: char.xpToNext,
      skills,
      equipment: equipmentDetails,
      equipmentBonuses,
      isDead: char.hp <= 0,
    });
  }

  private showInventory(): void {
    const party = this.persistentParty ?? [];

    // Aggregate all items from all party members
    const itemMap = new Map<string, number>();
    for (const char of party) {
      for (const entry of char.inventory) {
        itemMap.set(entry.itemId, (itemMap.get(entry.itemId) ?? 0) + entry.quantity);
      }
    }

    const items = Array.from(itemMap.entries()).map(([itemId, quantity]) => {
      const tmpl = this.content.items.get(itemId);
      const effectLabel = tmpl ? this.getItemEffectLabel(tmpl) : '';
      return {
        itemId,
        name: tmpl?.name ?? itemId,
        description: tmpl?.description ?? '',
        quantity,
        effectLabel,
        canUse: !!tmpl,
      };
    });

    const invData: InventoryData = {
      items,
      party: party.map(c => ({
        name: c.name,
        hp: c.hp,
        maxHp: c.maxHp,
        mp: c.mp,
        maxMp: c.maxMp,
        alive: c.hp > 0,
      })),
      gold: this.gold,
    };

    this.inventoryScreen.show(invData);
  }

  private getItemEffectLabel(tmpl: { effect: { type: string; value: number } }): string {
    switch (tmpl.effect.type) {
      case 'heal': return `Restores ${tmpl.effect.value} HP`;
      case 'mp_restore': return `Restores ${tmpl.effect.value} MP`;
      case 'buff': return `+${tmpl.effect.value} ATK buff`;
      case 'cure_status': return 'Cures status ailments';
      case 'damage': return `Deals ${tmpl.effect.value} damage`;
      default: return '';
    }
  }

  private useItem(itemId: string, charIndex: number): void {
    const party = this.persistentParty;
    if (!party) return;
    const char = party[charIndex];
    if (!char || char.hp <= 0) return;

    const tmpl = this.content.items.get(itemId);
    if (!tmpl) return;

    // Pre-validate: reject items that would have no effect
    switch (tmpl.effect.type) {
      case 'heal':
        if (char.hp >= char.maxHp) return;
        break;
      case 'mp_restore':
        if (char.mp >= char.maxMp) return;
        break;
      case 'buff': {
        const MAX_ITEM_ATTACK_BUFF = 20;
        if (char.attackBuff >= MAX_ITEM_ATTACK_BUFF) return;
        break;
      }
      case 'cure_status':
        if (char.statuses.length === 0) return;
        break;
    }

    // Find and consume the item from any party member's inventory
    let consumed = false;
    for (const member of party) {
      const entry = member.inventory.find(e => e.itemId === itemId);
      if (entry && entry.quantity > 0) {
        entry.quantity--;
        if (entry.quantity <= 0) {
          member.inventory = member.inventory.filter(e => e.itemId !== itemId);
        }
        consumed = true;
        break;
      }
    }
    if (!consumed) return;

    // Apply item effect
    switch (tmpl.effect.type) {
      case 'heal':
        char.hp = Math.min(char.maxHp, char.hp + tmpl.effect.value);
        break;
      case 'mp_restore':
        char.mp = Math.min(char.maxMp, char.mp + tmpl.effect.value);
        break;
      case 'buff': {
        const MAX_ITEM_ATTACK_BUFF = 20;
        const available = Math.max(0, MAX_ITEM_ATTACK_BUFF - char.attackBuff);
        const gain = Math.min(tmpl.effect.value, available);
        char.attack += gain;
        char.attackBuff += gain;
        break;
      }
      case 'cure_status':
        char.statuses = [];
        break;
    }

    // Re-show inventory with updated data
    this.showInventory();
  }

  private showRewardScreen(): void {
    if (this.pendingRewardData) {
      this.rewardScreen.show(this.pendingRewardData);
      this.pendingRewardData = null;
    }
  }

  private hideCombat(): void {
    if (this.combatController) {
      this.combatController.hide();
    }
    if (this.combatRenderer) {
      this.combatRenderer.clear();
      this.combatRenderer = undefined;
    }
  }
}
