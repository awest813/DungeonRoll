// Main menu / title screen

export interface MainMenuScreen {
  show(): void;
  hide(): void;
  destroy(): void;
  onNewGame(callback: () => void): void;
}

export function createMainMenuScreen(): MainMenuScreen {
  const container = document.createElement('div');
  container.id = 'main-menu-screen';
  container.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
    background: radial-gradient(ellipse at center, rgba(10, 10, 30, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%);
    font-family: 'Courier New', monospace;
  `;

  // Decorative top border
  const topDecor = document.createElement('div');
  topDecor.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, #4CAF50, #ffa500, #4CAF50, transparent);
  `;

  // Title block
  const titleBlock = document.createElement('div');
  titleBlock.style.cssText = `
    text-align: center;
    margin-bottom: 50px;
    animation: fadeInDown 0.8s ease-out;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 56px;
    font-weight: bold;
    color: #ffa500;
    text-shadow: 0 0 20px rgba(255, 165, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.8);
    letter-spacing: 8px;
    margin-bottom: 12px;
  `;
  title.textContent = 'DUNGEON ROLL';

  const subtitle = document.createElement('div');
  subtitle.style.cssText = `
    font-size: 16px;
    color: #aaa;
    letter-spacing: 4px;
    text-transform: uppercase;
  `;
  subtitle.textContent = 'A Tabletop JRPG Adventure';

  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 200px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #4CAF50, transparent);
    margin: 20px auto 0;
  `;

  titleBlock.appendChild(title);
  titleBlock.appendChild(subtitle);
  titleBlock.appendChild(divider);

  // Menu buttons container
  const menuBlock = document.createElement('div');
  menuBlock.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    animation: fadeInUp 0.8s ease-out 0.3s both;
  `;

  function createMenuButton(text: string, primary: boolean): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 260px;
      padding: 16px 32px;
      font-size: 18px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 3px;
      border: 2px solid ${primary ? '#4CAF50' : '#555'};
      border-radius: 6px;
      background: ${primary ? 'rgba(76, 175, 80, 0.15)' : 'rgba(40, 40, 40, 0.5)'};
      color: ${primary ? '#4CAF50' : '#888'};
      cursor: ${primary ? 'pointer' : 'default'};
      transition: all 0.25s ease;
      text-transform: uppercase;
    `;
    if (primary) {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(76, 175, 80, 0.3)';
        btn.style.borderColor = '#66BB6A';
        btn.style.color = '#66BB6A';
        btn.style.transform = 'scale(1.03)';
        btn.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(76, 175, 80, 0.15)';
        btn.style.borderColor = '#4CAF50';
        btn.style.color = '#4CAF50';
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
      });
    }
    return btn;
  }

  const newGameBtn = createMenuButton('New Game', true);
  const continueBtn = createMenuButton('Continue', false);
  continueBtn.title = 'Coming soon';

  menuBlock.appendChild(newGameBtn);
  menuBlock.appendChild(continueBtn);

  // Version / footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    position: absolute;
    bottom: 24px;
    font-size: 11px;
    color: #555;
    letter-spacing: 2px;
  `;
  footer.textContent = 'v0.3.0';

  container.appendChild(topDecor);
  container.appendChild(titleBlock);
  container.appendChild(menuBlock);
  container.appendChild(footer);

  // Inject keyframe animations
  if (!document.getElementById('menu-animations')) {
    const style = document.createElement('style');
    style.id = 'menu-animations';
    style.textContent = `
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      .screen-fade-out {
        animation: fadeOut 0.25s ease-out forwards;
        pointer-events: none !important;
      }
      /* Custom scrollbar for UI panels */
      #dungeon-map-screen ::-webkit-scrollbar,
      #reward-screen ::-webkit-scrollbar,
      #combat-ui ::-webkit-scrollbar {
        width: 6px;
      }
      #dungeon-map-screen ::-webkit-scrollbar-track,
      #reward-screen ::-webkit-scrollbar-track,
      #combat-ui ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      #dungeon-map-screen ::-webkit-scrollbar-thumb,
      #reward-screen ::-webkit-scrollbar-thumb,
      #combat-ui ::-webkit-scrollbar-thumb {
        background: rgba(76, 175, 80, 0.4);
        border-radius: 3px;
      }
      #dungeon-map-screen ::-webkit-scrollbar-thumb:hover,
      #reward-screen ::-webkit-scrollbar-thumb:hover,
      #combat-ui ::-webkit-scrollbar-thumb:hover {
        background: rgba(76, 175, 80, 0.6);
      }
      /* Remove button focus outline globally for game UI */
      #main-menu-screen button:focus,
      #dungeon-map-screen button:focus,
      #reward-screen button:focus,
      #defeat-screen button:focus,
      #combat-ui button:focus {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(container);

  let newGameCallback: (() => void) | null = null;

  newGameBtn.addEventListener('click', () => {
    if (newGameCallback) newGameCallback();
  });

  return {
    show() {
      container.style.display = 'flex';
    },
    hide() {
      container.style.display = 'none';
    },
    destroy() {
      container.remove();
    },
    onNewGame(callback) {
      newGameCallback = callback;
    },
  };
}
