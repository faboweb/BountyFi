import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

export function DailyTaskCameraScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.cameraContainer}>
        {/* Mock Camera View */}
        <View style={styles.mockCamera}>
          <Text style={styles.cameraEmoji}>📸</Text>
          <Text style={styles.cameraInstruction}>Position the proof within the frame</Text>
        </View>

        {/* Overlays */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.hintBadge}>
            <Text style={styles.hintText}>LIGHTING: GOOD ✅</Text>
          </View>
        </View>

        <View style={styles.bottomOverlay}>
          <View style={styles.shutterRow}>
            <View style={styles.galleryPlaceholder} />
            <TouchableOpacity style={styles.shutterOuter}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.flashButton}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>PROOF OF CLEANUP</Text>
        <Text style={styles.instructionText}>
          Take a clear photo of the gathered waste at the location.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  mockCamera: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraEmoji: {
    fontSize: 80,
    opacity: 0.3,
  },
  cameraInstruction: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
  },
  topBar: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: 'bold',
  },
  hintBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-evenly',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
  },
  galleryPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  instructionTitle: {
    ...Typography.heading,
    fontSize: 14,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  instructionText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textGray,
  },
});
