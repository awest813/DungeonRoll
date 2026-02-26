// Combat UI - individual turn order, bonus dice pool, element chains

export interface CombatUIPartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  isGuarding: boolean;
  statuses: string[];
  level: number;
}

export interface CombatUIEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isGuarding: boolean;
  statuses: string[];
  weakness?: string;
  resistance?: string;
}

export interface CombatUISkill {
  id: string;
  name: string;
  mpCost: number;
  description: string;
  targeting: string;
  element?: string;
}

export interface CombatUIItem {
  itemId: string;
  name: string;
  quantity: number;
}

export interface TurnOrderEntry {
  id: string;
  name: string;
  isParty: boolean;
  isCurrent: boolean;
  isDead: boolean;
}

export interface CombatUI {
  show(): void;
  hide(): void;
  updateParty(party: CombatUIPartyMember[]): void;
  updateEnemies(enemies: CombatUIEnemy[]): void;
  updateSkills(skills: CombatUISkill[], currentMp: number): void;
  updateItems(items: CombatUIItem[]): void;
  updateTurnCounter(turn: number): void;
  updateGold(gold: number): void;
  updateTurnOrder(entries: TurnOrderEntry[]): void;
  updateBonusDice(pool: number, max: number): void;
  updateElementChain(element: string, count: number): void;
  setCurrentActor(actorId: string | null): void;
  addLogEntry(message: string): void;
  clearLog(): void;
  onAttack(callback: (heroIndex: number, targetEnemyIndex: number) => void): void;
  onGuard(callback: (heroIndex: number) => void): void;
  onSkill(callback: (heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void): void;
  onItem(callback: (heroIndex: number, itemId: string, targetIndex: number) => void): void;
  onEndTurn(callback: () => void): void;
  onHeroSelect(callback: (heroIndex: number) => void): void;
  onBonusDiceChange(callback: (count: number) => void): void;
  setActionsEnabled(enabled: boolean): void;
  destroy(): void;
}

export function createCombatUI(): CombatUI {
  const container = document.createElement('div');
  container.id = 'combat-ui';
  container.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    display: flex; flex-direction: column;
    font-family: monospace; color: #e0e0e0;
    z-index: 100; overflow: hidden;
  `;

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    padding: 12px 20px; background: rgba(0,0,0,0.4);
    border-bottom: 2px solid #0f9d58; font-size: 14px;
    display: flex; justify-content: space-between; align-items: center;
  `;
  container.appendChild(titleEl);

  const turnOrderBar = document.createElement('div');
  turnOrderBar.style.cssText = `
    padding: 8px 20px; background: rgba(0,0,0,0.3);
    border-bottom: 1px solid #666; font-size: 12px;
    display: flex; gap: 8px; align-items: center; overflow-x: auto;
    white-space: nowrap;
  `;
  container.appendChild(turnOrderBar);

  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    flex: 1; display: flex; gap: 20px; padding: 20px;
    overflow: hidden;
  `;
  container.appendChild(contentEl);

  // Left panel: party and enemies
  const leftPanel = document.createElement('div');
  leftPanel.style.cssText = `
    flex: 1; display: flex; flex-direction: column; gap: 20px;
    overflow-y: auto; padding-right: 10px;
  `;
  contentEl.appendChild(leftPanel);

  const partySection = document.createElement('div');
  partySection.style.cssText = `
    border: 1px solid rgba(15, 157, 88, 0.3); padding: 12px;
    border-radius: 6px; background: rgba(0,0,0,0.2);
  `;
  leftPanel.appendChild(partySection);

  const partyHeader = document.createElement('div');
  partyHeader.textContent = 'YOUR PARTY';
  partyHeader.style.cssText = `
    color: #0f9d58; margin-bottom: 10px; font-weight: bold; font-size: 12px;
  `;
  partySection.appendChild(partyHeader);

  const partyList = document.createElement('div');
  partyList.id = 'party-list';
  partySection.appendChild(partyList);

  const enemySection = document.createElement('div');
  enemySection.style.cssText = `
    border: 1px solid rgba(229, 57, 53, 0.3); padding: 12px;
    border-radius: 6px; background: rgba(0,0,0,0.2); flex: 0 0 auto;
  `;
  leftPanel.appendChild(enemySection);

  const enemyHeader = document.createElement('div');
  enemyHeader.textContent = 'ENEMIES';
  enemyHeader.style.cssText = `
    color: #e53935; margin-bottom: 10px; font-weight: bold; font-size: 12px;
  `;
  enemySection.appendChild(enemyHeader);

  const enemyList = document.createElement('div');
  enemyList.id = 'enemy-list';
  enemySection.appendChild(enemyList);

  // Right panel: actions and log
  const rightPanel = document.createElement('div');
  rightPanel.style.cssText = `
    flex: 0 0 350px; display: flex; flex-direction: column; gap: 12px;
  `;
  contentEl.appendChild(rightPanel);

  const bonusDiceSection = document.createElement('div');
  bonusDiceSection.style.cssText = `
    border: 1px solid rgba(255, 235, 59, 0.3); padding: 10px;
    border-radius: 6px; background: rgba(0,0,0,0.2);
  `;
  rightPanel.appendChild(bonusDiceSection);

  const bonusDiceLabel = document.createElement('div');
  bonusDiceLabel.textContent = 'BONUS DICE';
  bonusDiceLabel.style.cssText = `
    color: #ffd740; font-weight: bold; font-size: 11px; margin-bottom: 6px;
  `;
  bonusDiceSection.appendChild(bonusDiceLabel);

  const bonusDiceDisplay = document.createElement('div');
  bonusDiceDisplay.id = 'bonus-dice-display';
  bonusDiceDisplay.style.cssText = `
    font-size: 12px; margin-bottom: 6px;
  `;
  bonusDiceSection.appendChild(bonusDiceDisplay);

  const bonusDiceControls = document.createElement('div');
  bonusDiceControls.id = 'bonus-dice-controls';
  bonusDiceControls.style.cssText = `
    display: flex; gap: 8px; align-items: center;
  `;
  bonusDiceSection.appendChild(bonusDiceControls);

  const actionsSection = document.createElement('div');
  actionsSection.id = 'actions-section';
  actionsSection.style.cssText = `
    border: 1px solid rgba(33, 150, 243, 0.3); padding: 12px;
    border-radius: 6px; background: rgba(0,0,0,0.2); flex: 0 0 auto;
  `;
  rightPanel.appendChild(actionsSection);

  const logSection = document.createElement('div');
  logSection.style.cssText = `
    border: 1px solid #666; padding: 12px;
    border-radius: 6px; background: rgba(0,0,0,0.5); flex: 1;
    overflow-y: auto; font-size: 11px;
  `;
  rightPanel.appendChild(logSection);

  const logContent = document.createElement('div');
  logContent.id = 'log-content';
  logSection.appendChild(logContent);

  // State variables
  let party: CombatUIPartyMember[] = [];
  let enemies: CombatUIEnemy[] = [];
  let skills: CombatUISkill[] = [];
  let items: CombatUIItem[] = [];
  let currentHeroIndex: number = 0;
  let currentMp: number = 0;
  let turnCounter: number = 0;
  let gold: number = 0;
  let turnOrderEntries: TurnOrderEntry[] = [];
  let bonusDicePool: number = 0;
  let bonusDiceMax: number = 10;
  let bonusDiceToSpend: number = 0;
  let elementChainElement: string = 'none';
  let elementChainCount: number = 0;
  let currentActorId: string | null = null;
  let actionsEnabled: boolean = true;

  // Callbacks
  let onAttackCallback: ((heroIndex: number, targetEnemyIndex: number) => void) | null = null;
  let onGuardCallback: ((heroIndex: number) => void) | null = null;
  let onSkillCallback: ((heroIndex: number, skillId: string, targetIndex: number, isAlly: boolean) => void) | null = null;
  let onItemCallback: ((heroIndex: number, itemId: string, targetIndex: number) => void) | null = null;
  let onEndTurnCallback: (() => void) | null = null;
  let onHeroSelectCallback: ((heroIndex: number) => void) | null = null;
  let onBonusDiceChangeCallback: ((count: number) => void) | null = null;

  const renderParty = () => {
    partyList.innerHTML = '';
    party.forEach((member, idx) => {
      const isCurrent = currentActorId && currentActorId.includes(`-${idx}`) || (currentHeroIndex === idx);
      const memberEl = document.createElement('div');
      memberEl.style.cssText = `
        margin-bottom: 8px; padding: 8px; border-radius: 4px;
        background: ${isCurrent ? 'rgba(0, 150, 136, 0.3)' : 'rgba(255,255,255,0.05)'};
        border: ${isCurrent ? '1px solid #26a69a' : '1px solid #555'};
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        color: ${member.hp <= 0 ? '#999' : '#fff'}; font-weight: bold;
        text-decoration: ${member.hp <= 0 ? 'line-through' : 'none'};
      `;
      nameEl.textContent = member.name;
      memberEl.appendChild(nameEl);

      const statsEl = document.createElement('div');
      statsEl.style.cssText = `
        font-size: 10px; color: #aaa; margin-top: 2px;
      `;
      const hpBar = `[HP:${'█'.repeat(Math.ceil(member.hp / member.maxHp * 10))}${'░'.repeat(10 - Math.ceil(member.hp / member.maxHp * 10))}]`;
      const mpBar = `[MP:${'█'.repeat(Math.ceil(member.mp / member.maxMp * 5))}${'░'.repeat(5 - Math.ceil(member.mp / member.maxMp * 5))}]`;
      statsEl.textContent = `${hpBar} ${mpBar} ${member.statuses.join(' ')}`;
      memberEl.appendChild(statsEl);

      partyList.appendChild(memberEl);
    });
  };

  const renderEnemies = () => {
    enemyList.innerHTML = '';
    enemies.forEach((enemy, idx) => {
      const enemyEl = document.createElement('div');
      enemyEl.style.cssText = `
        margin-bottom: 8px; padding: 8px; border-radius: 4px;
        background: ${enemy.hp <= 0 ? 'rgba(100,100,100,0.2)' : 'rgba(229,57,53,0.1)'};
        border: ${enemy.hp <= 0 ? '1px solid #666' : '1px solid #e53935'};
        cursor: pointer; user-select: none;
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        color: ${enemy.hp <= 0 ? '#999' : '#ff6b6b'}; font-weight: bold;
        text-decoration: ${enemy.hp <= 0 ? 'line-through' : 'none'};
      `;
      let nameText = enemy.name;
      if (enemy.weakness) {
        nameText += ` [WEAK:${enemy.weakness.toUpperCase()}]`;
      }
      if (enemy.resistance) {
        nameText += ` [RES:${enemy.resistance.toUpperCase()}]`;
      }
      nameEl.textContent = nameText;
      enemyEl.appendChild(nameEl);

      const statsEl = document.createElement('div');
      statsEl.style.cssText = `
        font-size: 10px; color: #aaa; margin-top: 2px;
      `;
      const hpBar = `[HP:${'█'.repeat(Math.ceil(enemy.hp / enemy.maxHp * 10))}${'░'.repeat(10 - Math.ceil(enemy.hp / enemy.maxHp * 10))}]`;
      statsEl.textContent = `${hpBar} ${enemy.statuses.join(' ')}`;
      enemyEl.appendChild(statsEl);

      enemyEl.addEventListener('click', () => {
        if (actionsEnabled) {
          if (onAttackCallback) onAttackCallback(currentHeroIndex, idx);
        }
      });
      enemyList.appendChild(enemyEl);
    });
  };

  const renderActionButtons = () => {
    actionsSection.innerHTML = '';

    const heroHeader = document.createElement('div');
    heroHeader.style.cssText = `
      color: #2196f3; font-weight: bold; margin-bottom: 10px; font-size: 11px;
    `;
    if (currentHeroIndex >= 0 && currentHeroIndex < party.length) {
      heroHeader.textContent = `ACTING: ${party[currentHeroIndex]?.name || 'None'}`;
    } else {
      heroHeader.textContent = 'ACTING: (Enemy)';
    }
    actionsSection.appendChild(heroHeader);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    `;
    actionsSection.appendChild(buttonContainer);

    // Attack button
    const attackBtn = document.createElement('button');
    attackBtn.textContent = 'ATTACK';
    attackBtn.style.cssText = `
      padding: 8px; border: 1px solid #ff6b6b; background: rgba(255,107,107,0.1);
      color: #ff6b6b; border-radius: 4px; cursor: pointer; font-family: monospace;
      font-size: 11px; transition: all 0.2s;
      ${!actionsEnabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    attackBtn.addEventListener('mouseover', (e) => {
      if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(255,107,107,0.3)';
    });
    attackBtn.addEventListener('mouseout', (e) => {
      if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(255,107,107,0.1)';
    });
    attackBtn.addEventListener('click', () => {
      if (actionsEnabled && enemies.length > 0 && onAttackCallback) {
        onAttackCallback(currentHeroIndex, 0);
      }
    });
    buttonContainer.appendChild(attackBtn);

    // Guard button
    const guardBtn = document.createElement('button');
    guardBtn.textContent = 'GUARD';
    guardBtn.style.cssText = `
      padding: 8px; border: 1px solid #4fc3f7; background: rgba(79,195,247,0.1);
      color: #4fc3f7; border-radius: 4px; cursor: pointer; font-family: monospace;
      font-size: 11px; transition: all 0.2s;
      ${!actionsEnabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    guardBtn.addEventListener('mouseover', (e) => {
      if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(79,195,247,0.3)';
    });
    guardBtn.addEventListener('mouseout', (e) => {
      if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(79,195,247,0.1)';
    });
    guardBtn.addEventListener('click', () => {
      if (actionsEnabled && onGuardCallback) {
        onGuardCallback(currentHeroIndex);
      }
    });
    buttonContainer.appendChild(guardBtn);

    // Skills section
    const skillsLabel = document.createElement('div');
    skillsLabel.textContent = 'SKILLS';
    skillsLabel.style.cssText = `
      grid-column: 1 / -1; color: #ffd740; font-weight: bold; font-size: 10px;
      margin-top: 8px;
    `;
    buttonContainer.appendChild(skillsLabel);

    if (skills.length === 0) {
      const noSkills = document.createElement('div');
      noSkills.textContent = '(none)';
      noSkills.style.cssText = `
        grid-column: 1 / -1; color: #666; font-size: 10px;
      `;
      buttonContainer.appendChild(noSkills);
    } else {
      skills.slice(0, 6).forEach((skill, idx) => {
        const skillBtn = document.createElement('button');
        skillBtn.textContent = `${skill.name}(${skill.mpCost}MP)`;
        skillBtn.style.cssText = `
          padding: 6px; border: 1px solid #ffd740; background: rgba(255,215,0,0.05);
          color: #ffd740; border-radius: 4px; cursor: pointer; font-family: monospace;
          font-size: 9px; transition: all 0.2s;
          ${!actionsEnabled || currentMp < skill.mpCost ? 'opacity: 0.5; cursor: not-allowed;' : ''}
        `;
        skillBtn.addEventListener('mouseover', (e) => {
          if (actionsEnabled && currentMp >= skill.mpCost) {
            (e.target as HTMLElement).style.background = 'rgba(255,215,0,0.2)';
          }
        });
        skillBtn.addEventListener('mouseout', (e) => {
          if (actionsEnabled && currentMp >= skill.mpCost) {
            (e.target as HTMLElement).style.background = 'rgba(255,215,0,0.05)';
          }
        });
        skillBtn.addEventListener('click', () => {
          if (actionsEnabled && currentMp >= skill.mpCost && onSkillCallback) {
            onSkillCallback(currentHeroIndex, skill.id, 0, skill.targeting.includes('ally'));
          }
        });
        buttonContainer.appendChild(skillBtn);
      });
    }

    // Items section
    if (items.length > 0) {
      const itemsLabel = document.createElement('div');
      itemsLabel.textContent = 'ITEMS';
      itemsLabel.style.cssText = `
        grid-column: 1 / -1; color: #4caf50; font-weight: bold; font-size: 10px;
        margin-top: 8px;
      `;
      buttonContainer.appendChild(itemsLabel);

      items.slice(0, 3).forEach((item, idx) => {
        const itemBtn = document.createElement('button');
        itemBtn.textContent = `${item.name}(${item.quantity})`;
        itemBtn.style.cssText = `
          padding: 6px; border: 1px solid #4caf50; background: rgba(76,175,80,0.05);
          color: #4caf50; border-radius: 4px; cursor: pointer; font-family: monospace;
          font-size: 9px; transition: all 0.2s;
          ${!actionsEnabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
        `;
        itemBtn.addEventListener('mouseover', (e) => {
          if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(76,175,80,0.2)';
        });
        itemBtn.addEventListener('mouseout', (e) => {
          if (actionsEnabled) (e.target as HTMLElement).style.background = 'rgba(76,175,80,0.05)';
        });
        itemBtn.addEventListener('click', () => {
          if (actionsEnabled && onItemCallback) {
            onItemCallback(currentHeroIndex, item.itemId, currentHeroIndex);
          }
        });
        buttonContainer.appendChild(itemBtn);
      });
    }
  };

  const updateTitleBar = () => {
    titleEl.innerHTML = '';
    const leftText = document.createElement('span');
    leftText.textContent = 'COMBAT';
    titleEl.appendChild(leftText);

    const rightText = document.createElement('span');
    rightText.style.cssText = `
      display: flex; gap: 20px; align-items: center;
    `;
    const turnSpan = document.createElement('span');
    turnSpan.textContent = `TURN ${turnCounter}`;
    rightText.appendChild(turnSpan);

    const goldSpan = document.createElement('span');
    goldSpan.textContent = `${gold}g`;
    rightText.appendChild(goldSpan);

    if (elementChainCount > 0) {
      const chainSpan = document.createElement('span');
      chainSpan.style.color = '#ffd740';
      chainSpan.textContent = `${elementChainElement.toUpperCase()} CHAIN x${elementChainCount}`;
      rightText.appendChild(chainSpan);
    }

    titleEl.appendChild(rightText);
  };

  return {
    show() {
      document.body.appendChild(container);
    },
    hide() {
      container.remove();
    },
    updateParty(p) {
      party = p;
      renderParty();
    },
    updateEnemies(e) {
      enemies = e;
      renderEnemies();
    },
    updateSkills(s, mp) {
      skills = s;
      currentMp = mp;
      renderActionButtons();
    },
    updateItems(i) {
      items = i;
      renderActionButtons();
    },
    updateTurnCounter(turn) {
      turnCounter = turn;
      updateTitleBar();
    },
    updateGold(g) {
      gold = g;
      updateTitleBar();
    },
    updateTurnOrder(entries) {
      turnOrderEntries = entries;
      turnOrderBar.innerHTML = '';
      entries.forEach(entry => {
        const badge = document.createElement('div');
        badge.style.cssText = `
          padding: 4px 8px; border-radius: 3px; font-size: 10px;
          background: ${entry.isCurrent ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'};
          border: 1px solid ${entry.isCurrent ? '#ffd740' : '#666'};
          color: ${entry.isDead ? '#666' : entry.isParty ? '#26a69a' : '#ff6b6b'};
          text-decoration: ${entry.isDead ? 'line-through' : 'none'};
        `;
        badge.textContent = entry.name;
        turnOrderBar.appendChild(badge);
      });
    },
    updateBonusDice(pool, max) {
      bonusDicePool = pool;
      bonusDiceMax = max;
      bonusDiceDisplay.innerHTML = '';
      const poolLabel = document.createElement('div');
      poolLabel.textContent = `Pool: ${pool}/${max}`;
      bonusDiceDisplay.appendChild(poolLabel);

      bonusDiceControls.innerHTML = '';
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '−';
      minusBtn.style.cssText = `
        padding: 4px 8px; border: 1px solid #ffd740; background: rgba(255,215,0,0.1);
        color: #ffd740; border-radius: 3px; cursor: pointer; font-size: 12px;
      `;
      minusBtn.addEventListener('click', () => {
        if (bonusDiceToSpend > 0) {
          bonusDiceToSpend--;
          if (onBonusDiceChangeCallback) onBonusDiceChangeCallback(bonusDiceToSpend);
        }
      });
      bonusDiceControls.appendChild(minusBtn);

      const spendLabel = document.createElement('span');
      spendLabel.textContent = `Spend: ${bonusDiceToSpend}`;
      spendLabel.style.cssText = 'flex: 0 0 auto; font-size: 11px;';
      bonusDiceControls.appendChild(spendLabel);

      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.style.cssText = `
        padding: 4px 8px; border: 1px solid #ffd740; background: rgba(255,215,0,0.1);
        color: #ffd740; border-radius: 3px; cursor: pointer; font-size: 12px;
      `;
      plusBtn.addEventListener('click', () => {
        if (bonusDiceToSpend < bonusDicePool) {
          bonusDiceToSpend++;
          if (onBonusDiceChangeCallback) onBonusDiceChangeCallback(bonusDiceToSpend);
        }
      });
      bonusDiceControls.appendChild(plusBtn);
    },
    updateElementChain(element, count) {
      elementChainElement = element;
      elementChainCount = count;
      updateTitleBar();
    },
    setCurrentActor(actorId) {
      currentActorId = actorId;
      renderParty();
      renderEnemies();
    },
    addLogEntry(message) {
      const entry = document.createElement('div');
      entry.textContent = message;
      entry.style.cssText = 'padding: 2px 0; color: #bbb;';
      logContent.appendChild(entry);
      logSection.scrollTop = logSection.scrollHeight;
    },
    clearLog() {
      logContent.innerHTML = '';
    },
    onAttack(callback) {
      onAttackCallback = callback;
    },
    onGuard(callback) {
      onGuardCallback = callback;
    },
    onSkill(callback) {
      onSkillCallback = callback;
    },
    onItem(callback) {
      onItemCallback = callback;
    },
    onEndTurn(callback) {
      onEndTurnCallback = callback;
    },
    onHeroSelect(callback) {
      onHeroSelectCallback = callback;
    },
    onBonusDiceChange(callback) {
      onBonusDiceChangeCallback = callback;
    },
    setActionsEnabled(enabled) {
      actionsEnabled = enabled;
      renderActionButtons();
    },
    destroy() {
      container.remove();
    },
  };
}
