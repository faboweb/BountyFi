/**
 * BountyFi Brand - Playful Victory Edition
 * Admiral Blue, Winner Gold, Success Green
 */

export const colors = {
  // Primary - Admiral Blue
  admiralBlueDark: '#1E3A8A',
  admiralBlueBright: '#3B82F6',
  admiralBlueLight: '#60A5FA',

  // Accent
  winnerGold: '#FBBF24',
  deepGold: '#F59E0B',
  successGreen: '#10B981',
  white: '#FFFFFF',

  // Supporting (UI)
  textGray: '#6B7280',
  lightGray: '#F9FAFB',
  navyBlack: '#1E293B',
  borderGray: '#E5E7EB',

  // Semantic
  error: '#EF4444',
  warning: '#F59E0B',
} as const;

/** Primary blue gradient (135deg): dark → bright. Use with LinearGradient or as fallback. */
export const gradientStops = {
  primaryBlue: ['#1E3A8A', '#3B82F6'] as const,
  gold: ['#FBBF24', '#F59E0B', '#FBBF24'] as const,
  success: ['#3B82F6', '#10B981'] as const,
} as const;

export type Colors = typeof colors;
