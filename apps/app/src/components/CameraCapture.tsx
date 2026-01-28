// Camera Capture Component
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

interface CameraCaptureProps {
  cameraType: 'front' | 'back';
  onCapture: (uri: string, gps?: { lat: number; lng: number }) => void;
  onError: (error: string) => void;
  requireGPS?: boolean;
}

export function CameraCapture({
  cameraType,
  onCapture,
  onError,
  requireGPS = false,
}: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (requireGPS) {
      checkLocationPermission();
    }
  }, [requireGPS]);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status);
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(newStatus);
      if (newStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to capture GPS data',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      onError('Camera not ready');
      return;
    }

    if (requireGPS && locationPermission !== 'granted') {
      Alert.alert('Error', 'Location permission is required');
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      let gps: { lat: number; lng: number } | undefined;
      if (requireGPS && locationPermission === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          gps = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
        } catch (error) {
          console.warn('Failed to get GPS:', error);
          // Continue without GPS - validation will catch it
        }
      }

      onCapture(photo.uri, gps);
    } catch (error: any) {
      onError(error.message || 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType === 'front' ? 'front' : 'back'}
      >
        <View style={styles.overlay}>
          <View style={styles.captureButtonContainer}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  text: {
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
