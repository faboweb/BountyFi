import * as React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/theme';

interface LocationResult {
  name: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  initialRegion: any;
  pin: { latitude: number; longitude: number } | null;
  onPinChange: (coordinate: { latitude: number; longitude: number }) => void;
  onLocationSelect?: (name: string) => void;
}

export function MapPicker({ initialRegion, pin, onPinChange, onLocationSelect }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [results, setResults] = React.useState<LocationResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  const searchLocation = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
      const data = await response.json();
      
      const formattedResults: LocationResult[] = data.features.map((f: any) => ({
        name: f.properties.name || f.properties.street || f.properties.city || 'Unknown Location',
        city: f.properties.city,
        country: f.properties.country,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));
      
      setResults(formattedResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (item: LocationResult) => {
    const coord = { latitude: item.latitude, longitude: item.longitude };
    onPinChange(coord);
    if (onLocationSelect) {
      onLocationSelect(item.name);
    }
    setSearchQuery(item.name);
    setShowResults(false);
  };

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      
      onPinChange(coord);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  // Generate an OSM embed URL for a simple preview
  const getMapUrl = () => {
    if (!pin) return '';
    const { latitude, longitude } = pin;
    const delta = 0.005;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}&layer=mapnik&marker=${latitude},${longitude}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Search for a location..."
            placeholderTextColor={Colors.textGray}
            value={searchQuery}
            onChangeText={searchLocation}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {searching && <ActivityIndicator size="small" color={Colors.ivoryBlue} style={styles.loader} />}
        </View>

        {showResults && results.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultDetails}>
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>

      <View style={styles.map}>
        {pin ? (
          <iframe
            title="Map"
            style={{ width: '100%', height: '100%', border: 0 }}
            src={getMapUrl()}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Search or use GPS to see map</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.myLocationBtn} onPress={useMyLocation}>
        <Text style={styles.myLocationIcon}>📍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  map: {
    flex: 1,
    backgroundColor: '#eee',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.textGray,
    fontSize: 14,
  },
  searchContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    paddingRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    color: Colors.navyBlack,
  },
  loader: {
    marginLeft: Spacing.xs,
  },
  resultsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    maxHeight: 200,
    ...Shadows.lg,
  },
  resultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  resultName: {
    fontWeight: '600',
    color: Colors.navyBlack,
    fontSize: 14,
  },
  resultDetails: {
    fontSize: 12,
    color: Colors.textGray,
    marginTop: 2,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  myLocationIcon: {
    fontSize: 20,
  },
});
