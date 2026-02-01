/**
 * BountyFi typography - Modern sans-serif, neumorphic style
 * Bold headings, uppercase buttons, regular body, monospace-like for numbers
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: undefined as string | undefined,
  bold: undefined,
  extraBold: undefined,
};

export const typography = {
  heading: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '700' as const,
    fontSize: 28,
    color: '#2C2C2C',
  } satisfies TextStyle,

  title: {
    fontFamily: fontFamily.bold,
    fontWeight: '600' as const,
    fontSize: 20,
    color: '#2C2C2C',
  } satisfies TextStyle,

  tagline: {
    fontFamily: fontFamily.bold,
    fontWeight: '600' as const,
    fontSize: 16,
    color: '#6B7280',
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 16,
    color: '#2C2C2C',
  } satisfies TextStyle,

  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 14,
    color: '#6B7280',
  } satisfies TextStyle,

  button: {
    fontFamily: fontFamily.bold,
    fontWeight: '700' as const,
    fontSize: 16,
    textTransform: 'uppercase' as const,
    color: '#2C2C2C',
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontWeight: '400' as const,
    fontSize: 12,
    color: '#6B7280',
  } satisfies TextStyle,

  stat: {
    fontFamily: fontFamily.bold,
    fontWeight: '700' as const,
    fontSize: 24,
    color: '#2C2C2C',
  } satisfies TextStyle,

  timer: {
    fontFamily: fontFamily.bold,
    fontWeight: '700' as const,
    fontSize: 32,
    letterSpacing: 2,
    color: '#2C2C2C',
  } satisfies TextStyle,
} as const;

export type Typography = typeof typography;
