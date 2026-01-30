import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme';

export function DailyTaskCameraScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Camera viewfinder area */}
      <View style={styles.cameraViewfinder}>
        <View style={styles.viewfinderOverlay} />
        <Text style={styles.cameraHint}>
          📸 Center the area in the frame{'\n'}
          Location (GPS) is recorded with your photo.
        </Text>
        <Text style={styles.cameraPlaceholder}>📷</Text>
      </View>

      {/* Controls */}
      <View style={styles.cameraControls}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.captureButton}
          onPress={() => {}}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <Text style={styles.locationHint}>Make sure your location is enabled</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraViewfinder: {
    flex: 1,
    minHeight: 400,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewfinderOverlay: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
  },
  cameraHint: {
    position: 'absolute',
    top: 40,
    left: '10%',
    right: '10%',
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  cameraPlaceholder: {
    fontSize: 80,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  cameraControls: {
    padding: Spacing.lg,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    borderWidth: 6,
    borderColor: Colors.ivoryBlue,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.coral,
  },
  locationHint: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.md,
    fontSize: 13,
  },
});
