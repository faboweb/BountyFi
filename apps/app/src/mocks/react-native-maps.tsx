/**
 * Stub for react-native-maps so the app runs in Expo Go without RNMapsAirModule.
 * Metro resolves 'react-native-maps' to this file (see metro.config.js).
 */
import React from 'react';
import { View } from 'react-native';

function MapViewStub(_props: object) {
  return <View />;
}

function MarkerStub(_props: object) {
  return null;
}

export default MapViewStub;
export const Marker = MarkerStub;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
