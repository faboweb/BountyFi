// Photo Preview Component
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface PhotoPreviewProps {
  uri: string;
  onRetake?: () => void;
  onContinue?: () => void;
  readonly?: boolean;
}

export function PhotoPreview({ uri, onRetake, onContinue, readonly = false }: PhotoPreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      {!readonly && (
        <View style={styles.actions}>
          {onRetake && (
            <TouchableOpacity style={styles.button} onPress={onRetake}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          )}
          {onContinue && (
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onContinue}>
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  primaryButtonText: {
    color: '#fff',
  },
});
