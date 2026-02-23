// Defeat / game over screen

export interface DefeatScreen {
  show(): void;
  hide(): void;
  destroy(): void;
  onReturnToTitle(callback: () => void): void;
}

export function createDefeatScreen(): DefeatScreen {
  const container = document.createElement('div');
  container.id = 'defeat-screen';
  container.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
    background: radial-gradient(ellipse at center, rgba(30, 10, 10, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%);
    font-family: 'Courier New', monospace;
    color: #fff;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: 500px;
    background: rgba(30, 20, 20, 0.95);
    border: 2px solid #f44336;
    border-radius: 10px;
    text-align: center;
    animation: fadeIn 0.6s ease-out;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, rgba(244, 67, 54, 0.3), rgba(30, 10, 10, 0.9));
    padding: 30px;
    border-bottom: 2px solid #f44336;
  `;
  header.innerHTML = `
    <div style="font-size: 42px; font-weight: bold; color: #f44336; text-shadow: 0 0 20px rgba(244, 67, 54, 0.5); letter-spacing: 6px;">
      GAME OVER
    </div>
  `;

  const body = document.createElement('div');
  body.style.cssText = `padding: 30px 24px;`;
  body.innerHTML = `
    <div style="font-size: 14px; color: #aaa; margin-bottom: 8px; line-height: 1.6;">
      The dungeon has claimed another party...
    </div>
    <div style="font-size: 13px; color: #888; margin-bottom: 30px;">
      But heroes never stay down for long.
    </div>
    <button id="return-title-btn" style="
      width: 260px;
      padding: 16px 32px;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 3px;
      border: 2px solid #f44336;
      border-radius: 6px;
      background: rgba(244, 67, 54, 0.15);
      color: #f44336;
      cursor: pointer;
      transition: all 0.25s ease;
      text-transform: uppercase;
    ">Return to Title</button>
  `;

  panel.appendChild(header);
  panel.appendChild(body);
  container.appendChild(panel);
  document.body.appendChild(container);

  let returnCallback: (() => void) | null = null;

  const returnBtn = document.getElementById('return-title-btn')!;
  returnBtn.addEventListener('mouseenter', () => {
    returnBtn.style.background = 'rgba(244, 67, 54, 0.3)';
    returnBtn.style.transform = 'scale(1.03)';
    returnBtn.style.boxShadow = '0 0 20px rgba(244, 67, 54, 0.3)';
  });
  returnBtn.addEventListener('mouseleave', () => {
    returnBtn.style.background = 'rgba(244, 67, 54, 0.15)';
    returnBtn.style.transform = 'scale(1)';
    returnBtn.style.boxShadow = 'none';
  });
  returnBtn.addEventListener('click', () => {
    if (returnCallback) returnCallback();
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
    onReturnToTitle(callback) {
      returnCallback = callback;
    },
  };
}
