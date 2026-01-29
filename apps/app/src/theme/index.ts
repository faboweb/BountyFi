/**
 * BountyFi design system - Playful Victory Edition
 * Colors, typography, spacing, radii, shadows
 */

export { colors, gradientStops } from './colors';
export type { Colors } from './colors';
export { typography, fontFamily } from './typography';
export type { Typography } from './typography';

import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

/** Colored shadows (blue/gold tint, not pure black) */
export const shadows = {
  primary: {
    shadowColor: colors.admiralBlueDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: colors.navyBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: colors.admiralBlueDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
