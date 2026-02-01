/**
 * BountyFi theme - Confident, editorial
 * Warm off-white / cool grey background, directional shadow, bold type
 */

// Background: warm off-white / cool grey (reduced saturation, more “fancy”)
export const Colors = {
  // Background
  background: '#C6E3F5',
  backgroundLight: '#D4EBF7',

  // Primary - muted grey for surfaces
  primary: '#D8DCE1',
  primaryLight: '#E4E7EB',
  primaryDark: '#C2C7CE',

  // Legacy aliases (map to new palette)
  ivoryBlue: '#6A9BEB',
  ivoryBlueLight: '#8BB3F0',
  ivoryBlueDark: '#4A7BC4',
  primaryBright: '#6A9BEB',

  // Accent - soft orange/peach (mascot beak, level indicator)
  accent: '#FFCBA4',
  accentDark: '#F5B88A',

  // Chart / level fill
  chartBlue: '#6A9BEB',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#8E8E8E',
  textMeta: '#8E8E8E',

  // Mascot – darker contrasted blue
  mascotBlue: '#6BA3C7',
  mascotBlueLight: '#8BB8D9',

  // Palette (kept for compatibility)
  cream: '#C6E3F5',
  creamDark: '#D4EBF7',
  sunshine: '#FFCBA4',
  coral: '#FF8C6B',
  grass: '#81C784',
  accentNo: '#FF8A65',
  accentYes: '#81C784',
  lavender: '#A685D9',
  shadow: 'rgba(166, 180, 194, 0.25)',
  accentGold: '#FFCBA4',
  accentGoldDeep: '#FF8C6B',

  // UI
  success: '#7BC67E',
  error: '#FF4B4B',

  // Neutral
  streak: '#FF9600',
  currency: '#6A9BEB',
  xp: '#FFC800',
  missionPhoto: '#6A9BEB',
  missionQuest: '#A685D9',
  white: '#FFFFFF',
  lightGray: '#D1E2EE',
  textGray: '#6B7280',
  navyBlack: '#2C2C2C',

  // Gradients (soft blue)
  primaryGradient: ['#C6D8E4', '#D1E2EE'] as const,
  goldGradient: ['#FFCBA4', '#FFB380', '#FFCBA4'] as const,
  successGradient: ['#7BC67E', '#5DC561'] as const,
  coralGradient: ['#FF8C6B', '#FF6B4A'] as const,
  lavenderGradient: ['#A685D9', '#9071C9'] as const,
};

export const Typography = {
  heading: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  subHeading: {
    fontFamily: 'System',
    fontWeight: '600' as const,
    fontSize: 18,
    color: Colors.textSecondary,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 16,
    textTransform: 'uppercase' as const,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stat: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  timer: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 32,
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  overline: {
    fontFamily: 'System',
    fontWeight: '600' as const,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    fontSize: 17,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  /** Quiet metadata (rules, hints) – small, low contrast */
  metadata: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 11,
    color: Colors.textMeta,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  full: 9999,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  full: 9999,
};

// Directional shadow: y-offset, low blur, very low opacity (editorial)
export const Shadows = {
  primary: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  /** Cards – directional, not blur-heavy */
  card: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardElevated: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sm: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: {
    shadowColor: '#6A9BEB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  inset: {
    shadowColor: '#000',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: -1,
  },
};
