/**
 * BountyFi Brand - Playful Gamified (Ivory Blue one shade brighter)
 */

export const colors = {
  // Primary - Ivory Blue (brighter)
  ivoryBlue: '#5B8DAF',
  ivoryBlueLight: '#7CADCF',
  ivoryBlueDark: '#3A6478',

  // Legacy aliases
  admiralBlueDark: '#3A6478',
  admiralBlueBright: '#5B8DAF',
  admiralBlueLight: '#7CADCF',

  // Palette
  cream: '#FFF8F0',
  creamDark: '#F5EBD9',
  sunshine: '#FFD166',
  coral: '#FF8C6B',
  grass: '#7BC67E',
  lavender: '#A685D9',

  // Accent
  winnerGold: '#FFD166',
  deepGold: '#FF8C6B',
  successGreen: '#7BC67E',
  white: '#FFFFFF',

  // Supporting (UI)
  textGray: '#666666',
  lightGray: '#FFF8F0',
  navyBlack: '#3A6478',
  borderGray: '#E5E7EB',

  // Semantic
  error: '#FF4B4B',
  warning: '#FFD166',
} as const;

/** Gradients using ivory blue (one shade brighter). */
export const gradientStops = {
  primaryBlue: ['#5B8DAF', '#7CADCF'] as const,
  gold: ['#FFD166', '#FF8C6B', '#FFD166'] as const,
  success: ['#7BC67E', '#5DC561'] as const,
} as const;

export type Colors = typeof colors;
