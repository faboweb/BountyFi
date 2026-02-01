/**
 * BountyFi Brand - Soft blue neumorphic
 */

export const colors = {
  // Background
  background: '#E0F2F7',
  backgroundLight: '#E8F5F9',

  // Primary UI (neumorphic surfaces)
  primary: '#C6D8E4',
  primaryLight: '#D1E2EE',
  primaryDark: '#B0C4D4',

  // Accent
  ivoryBlue: '#6A9BEB',
  ivoryBlueLight: '#8BB3F0',
  ivoryBlueDark: '#4A7BC4',
  accent: '#FFCBA4',

  // Legacy
  admiralBlueDark: '#4A7BC4',
  admiralBlueBright: '#6A9BEB',
  admiralBlueLight: '#8BB3F0',

  // Palette
  cream: '#E0F2F7',
  creamDark: '#D1E2EE',
  sunshine: '#FFCBA4',
  coral: '#FF8C6B',
  grass: '#7BC67E',
  lavender: '#A685D9',

  // UI
  winnerGold: '#FFCBA4',
  deepGold: '#FF8C6B',
  successGreen: '#7BC67E',
  white: '#FFFFFF',

  // Text
  textGray: '#6B7280',
  lightGray: '#D1E2EE',
  navyBlack: '#2C2C2C',
  borderGray: '#B8CCD9',

  // Semantic
  error: '#FF4B4B',
  warning: '#FFCBA4',
} as const;

export const gradientStops = {
  primaryBlue: ['#C6D8E4', '#D1E2EE'] as const,
  gold: ['#FFCBA4', '#FFB380', '#FFCBA4'] as const,
  success: ['#7BC67E', '#5DC561'] as const,
} as const;

export type Colors = typeof colors;
