/**
 * BountyFi theme - Playful Gamified (Ivory Blue one shade brighter)
 * Fredoka for headings, DM Sans for body (use System until fonts loaded)
 */

// Ivory blue one shade brighter than original #4A7C9E / #6B9DBF / #2F5470
export const Colors = {
  // Primary - Ivory Blue (brighter)
  ivoryBlue: '#5B8DAF',
  ivoryBlueLight: '#7CADCF',
  ivoryBlueDark: '#3A6478',

  // Legacy aliases (same as ivory blue)
  primaryDark: '#3A6478',
  primaryBright: '#5B8DAF',
  primaryLight: '#7CADCF',

  // Palette
  cream: '#FFF8F0',
  creamDark: '#F5EBD9',
  sunshine: '#FFD166',
  coral: '#FF8C6B',
  grass: '#7BC67E',
  lavender: '#A685D9',
  shadow: 'rgba(91, 141, 175, 0.15)',
  accentGold: '#FFD166',
  accentGoldDeep: '#FF8C6B',

  // UI
  success: '#7BC67E',
  error: '#FF4B4B',

  // Neutral
  streak: '#FF9600',
  currency: '#5B8DAF',
  xp: '#FFC800',
  missionPhoto: '#5B8DAF',
  missionCleanup: '#7BC67E',
  missionQuest: '#A685D9',
  white: '#FFFFFF',
  lightGray: '#FFF8F0',
  textGray: '#666666',
  navyBlack: '#3A6478',

  // Gradients (ivory blue)
  primaryGradient: ['#5B8DAF', '#7CADCF'] as const,
  goldGradient: ['#FFD166', '#FF8C6B', '#FFD166'] as const,
  successGradient: ['#7BC67E', '#5DC561'] as const,
  coralGradient: ['#FF8C6B', '#FF6B4A'] as const,
  lavenderGradient: ['#A685D9', '#9071C9'] as const,
};

export const Typography = {
  heading: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 28,
    color: Colors.ivoryBlueDark,
  },
  subHeading: {
    fontFamily: 'System',
    fontWeight: '600' as const,
    fontSize: 18,
    color: Colors.textGray,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 16,
    color: Colors.navyBlack,
  },
  button: {
    fontFamily: 'System',
    fontWeight: '600' as const,
    fontSize: 16,
    color: Colors.white,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  primary: {
    shadowColor: Colors.ivoryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};
