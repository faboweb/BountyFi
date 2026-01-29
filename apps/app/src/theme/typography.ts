/**
 * BountyFi typography - System default (Arial/Helvetica/sans-serif)
 * Headings: ExtraBold, Uppercase; Body: Regular; Buttons: Bold
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: undefined as string | undefined,
  bold: undefined,
  extraBold: undefined,
};

export const typography = {
  /** Main heading - 800, uppercase, letter-spacing */
  heading: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '800' as const,
    fontSize: 28,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
    color: '#1E3A8A',
  } satisfies TextStyle,

  /** Section title */
  title: {
    fontFamily: fontFamily.bold,
    fontWeight: '700' as const,
    fontSize: 20,
    letterSpacing: 1,
    color: '#1E293B',
  } satisfies TextStyle,

  /** Tagline / subtitle */
  tagline: {
    fontFamily: fontFamily.bold,
    fontWeight: '600' as const,
    fontSize: 16,
    letterSpacing: 2,
    color: '#6B7280',
  } satisfies TextStyle,

  /** Body */
  body: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 16,
    color: '#1E293B',
  } satisfies TextStyle,

  /** Body secondary */
  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 14,
    color: '#6B7280',
  } satisfies TextStyle,

  /** Button text - bold, uppercase */
  button: {
    fontFamily: fontFamily.bold,
    fontWeight: '700' as const,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  /** Small / caption */
  caption: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 12,
    color: '#6B7280',
  } satisfies TextStyle,
} as const;

export type Typography = typeof typography;
