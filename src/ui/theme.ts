// Shared UI design system — single source of truth for visual constants
// Use these everywhere instead of hardcoded values for consistency.

// --- Color Palette ---

export const COLOR = {
  // Accent colors
  primary: '#4CAF50',       // green — allies, navigation, success
  accent: '#ffa500',        // orange — warnings, events, treasure
  danger: '#f44336',        // red — damage, enemies, alerts
  info: '#2196F3',          // blue — actions, MP
  magic: '#CE93D8',         // purple — items, XP
  gold: '#FFE082',          // gold — currency, rare items

  // Rarity colors
  rarityCommon: '#9E9E9E',
  rarityUncommon: '#4CAF50',
  rarityRare: '#FFD54F',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  textDisabled: '#555555',

  // HP bar thresholds
  hpHigh: '#4CAF50',
  hpMid: '#ffa500',
  hpLow: '#f44336',

  // Backgrounds
  panelBg: 'rgba(20, 20, 35, 0.95)',
  panelBorder: 'rgba(76, 175, 80, 0.6)',
  sectionBg: 'rgba(0, 0, 0, 0.3)',
  overlayBg: 'rgba(0, 0, 0, 0.75)',

  // Screen background gradient (dark blue base, consistent)
  screenGradientFrom: 'rgba(10, 10, 30, 0.95)',
  screenGradientTo: 'rgba(0, 0, 0, 0.98)',
} as const;

// --- Spacing ---

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const;

// --- Typography ---

export const FONT = {
  family: "'Courier New', monospace",
  sizeTitle: '40px',
  sizeHeading: '22px',
  sizeSubheading: '14px',
  sizeBody: '12px',
  sizeSmall: '11px',
  sizeTiny: '10px',
} as const;

// --- Layout ---

export const LAYOUT = {
  borderRadius: '6px',
  borderRadiusSm: '4px',
  borderWidth: '2px',
  panelWidthSm: '500px',
  panelWidthMd: '620px',
  panelWidthLg: '860px',
  disabledOpacity: '0.4',
} as const;

// --- Transitions ---

export const TRANSITION = {
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
  screen: '0.35s',
} as const;

// --- Helpers ---

export function hpColor(hp: number, maxHp: number): string {
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  if (pct > 50) return COLOR.hpHigh;
  if (pct > 25) return COLOR.hpMid;
  return COLOR.hpLow;
}

export function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'rare': return COLOR.rarityRare;
    case 'uncommon': return COLOR.rarityUncommon;
    default: return COLOR.rarityCommon;
  }
}

// Inject global CSS classes (call once at startup)
let injected = false;
export function injectGlobalStyles(): void {
  if (injected) return;
  injected = true;

  const style = document.createElement('style');
  style.textContent = `
    /* Screen fade-in animation */
    @keyframes screenFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .screen-fade-in {
      animation: screenFadeIn ${TRANSITION.screen} ease-out;
    }

    /* Smooth HP/XP bars */
    .bar-fill {
      transition: width ${TRANSITION.slow} ease-out;
    }

    /* Button base hover via CSS */
    .btn-hover:not([disabled]):hover {
      opacity: 0.85;
      transform: scale(1.03);
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.08);
    }
    .btn-hover:not([disabled]):active {
      transform: scale(0.98);
    }
    .btn-hover {
      transition: opacity ${TRANSITION.normal} ease,
                  transform ${TRANSITION.fast} ease,
                  box-shadow ${TRANSITION.normal} ease,
                  background ${TRANSITION.normal} ease,
                  border-color ${TRANSITION.normal} ease;
    }

    /* Consistent disabled state */
    .btn-hover[disabled] {
      opacity: ${LAYOUT.disabledOpacity};
      cursor: not-allowed;
    }

    /* Scrollbar styling for panels */
    .scroll-panel::-webkit-scrollbar { width: 6px; }
    .scroll-panel::-webkit-scrollbar-track { background: transparent; }
    .scroll-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
    .scroll-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
  `;
  document.head.appendChild(style);
}
