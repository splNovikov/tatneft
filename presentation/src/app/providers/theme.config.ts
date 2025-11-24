import { type ThemeConfig, theme } from 'antd';

const { defaultAlgorithm } = theme;

// Brand Colors
const COLORS = {
  white: '#ffffff',
  blueCharcoal: '#020a1c',
  lima: '#52c41a',
  sun: '#faad14',
  sunsetOrange: '#ff4d4f',
};

const THEME_COLORS = {
  colorPrimary: COLORS.blueCharcoal,
  colorSuccess: COLORS.lima,
  colorWarning: COLORS.sun,
  colorError: COLORS.sunsetOrange,

  white: COLORS.white,
};
const REFERENCED_COLORS = {
  primaryLight: lightenColor(THEME_COLORS.colorPrimary, 100),
  primaryLightest: lightenColor(THEME_COLORS.colorPrimary, 200),
  primaryVeryLight: lightenColor(THEME_COLORS.colorPrimary, 220),
};

export const appTheme: ThemeConfig = {
  algorithm: [defaultAlgorithm],
  token: {
    // Brand Colors
    colorPrimary: THEME_COLORS.colorPrimary,
    colorSuccess: THEME_COLORS.colorSuccess,
    colorWarning: THEME_COLORS.colorWarning,
    colorError: THEME_COLORS.colorError,
    colorInfo: REFERENCED_COLORS.primaryLight,
    colorLink: REFERENCED_COLORS.primaryLight,
  },

  components: {
    Table: {},

    Button: {},

    Card: {
      bodyPadding: 24,
    },

    Input: {},

    Layout: {
      headerBg: THEME_COLORS.white,
    },

    Menu: {
      itemBg: 'transparent',
      itemHeight: 48, // Better touch targets for mobile
      itemMarginInline: 4,
      itemBorderRadius: 8,
      itemPaddingInline: 16,
      iconSize: 20,
      iconMarginInlineEnd: 12,
    },

    Select: {
      optionSelectedBg: REFERENCED_COLORS.primaryLightest,
      optionSelectedColor: THEME_COLORS.colorPrimary,
      optionActiveBg: REFERENCED_COLORS.primaryVeryLight,
    },

    DatePicker: {
      cellActiveWithRangeBg: REFERENCED_COLORS.primaryLightest,
    },

    Alert: {},
  },
};

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.floor((num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
