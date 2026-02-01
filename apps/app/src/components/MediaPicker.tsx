import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/theme';

interface MediaPickerProps {
  onSelect: (uri: string) => void;
  onError: (error: string) => void;
}

export function MediaPicker({ onSelect, onError }: MediaPickerProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }

      setIsProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelect(result.assets[0].uri);
      }
    } catch (error: any) {
      onError(error.message || 'Failed to pick image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your camera.');
        return;
      }

      setIsProcessing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelect(result.assets[0].uri);
      }
    } catch (error: any) {
      onError(error.message || 'Failed to take photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      setIsProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelect(result.assets[0].uri);
      }
    } catch (error: any) {
      onError(error.message || 'Failed to pick document');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.optionCard} onPress={handlePickImage}>
        <View style={styles.iconCircle}>
          <Text style={styles.optionEmoji}>🖼️</Text>
        </View>
        <View style={styles.optionTextContent}>
          <Text style={styles.optionTitle}>Choose from Library</Text>
          <Text style={styles.optionSub}>Pick an existing photo</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} onPress={handlePickDocument}>
        <View style={styles.iconCircle}>
          <Text style={styles.optionEmoji}>📂</Text>
        </View>
        <View style={styles.optionTextContent}>
          <Text style={styles.optionTitle}>Upload File</Text>
          <Text style={styles.optionSub}>Browse your device files</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionCard} onPress={handleTakePhoto}>
        <View style={styles.iconCircle}>
          <Text style={styles.optionEmoji}>📸</Text>
        </View>
        <View style={styles.optionTextContent}>
          <Text style={styles.optionTitle}>Take Photo</Text>
          <Text style={styles.optionSub}>Use your camera</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.cream,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.cream,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textGray,
    fontFamily: Typography.body.fontFamily,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  optionEmoji: {
    fontSize: 30,
  },
  optionTextContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Typography.heading.fontFamily,
    color: Colors.ivoryBlueDark,
    marginBottom: 4,
  },
  optionSub: {
    fontSize: 14,
    color: Colors.textGray,
    fontFamily: Typography.body.fontFamily,
  },
});
