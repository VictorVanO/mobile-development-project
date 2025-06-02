import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';

// Define types
interface MarkerData {
  id: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
}

interface SearchResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  addresstype?: string;
}

export default function MapScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region>({
    latitude: 50.872986, // Brussels coordinates
    longitude: 4.309333,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Search state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Sample existing markers
  const existingMarkers: MarkerData[] = [
    { 
      id: 1, 
      coordinate: { latitude: 50.849368721107865, longitude: 4.349104494789498 }, 
      title: "Au Bon Bol", 
      description: "Restaurant chinois" 
    },
    { 
      id: 2, 
      coordinate: { latitude: 50.85033842838263, longitude: 4.350140743969398 }, 
      title: "Ninja House", 
      description: "Restaurant japonais" 
    },
  ];

  const countries = [
    "Belgium",
    "France", 
    "Germany",
    "Italy",
    "Spain",
    "Netherlands",
    "United Kingdom",
    "United States",
    "Canada"
  ];

  // Search effect - same logic as web version
  useEffect(() => {
    if (query.length < 3 || !selectedCountry) return;

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchQuery = `${query}, ${selectedCountry}`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&extratags=1`;
        
        console.log('Search URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'EatReal Mobile App'
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('Response text (first 200 chars):', text.substring(0, 200));
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text:', text);
          throw new Error('Invalid JSON response from search API');
        }
        
        console.log('Search results:', data);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Search Error', `Failed to search for restaurants: ${error.message}`);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Increased timeout to reduce API calls

    return () => clearTimeout(timeout);
  }, [query, selectedCountry]);

  const handleSelectPlace = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Update map view
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    setSearchResults([]);
    setQuery(result.display_name.split(',')[0] || 'Selected Restaurant');
    setSelectedPlace(result);
  };

  const handleAddReview = () => {
    if (!selectedPlace) return;
    
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to add a review.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    // Navigate to add review page with restaurant info
    router.push({
      pathname: '/add-review',
      params: {
        restaurantName: selectedPlace.display_name.split(',')[0] || 'Restaurant',
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lon,
        address: selectedPlace.display_name,
      }
    });
  };

  const handleViewReviews = () => {
    if (!selectedPlace) return;

    // Navigate to view reviews page
    router.push({
      pathname: '/restaurant-reviews',
      params: {
        restaurantName: selectedPlace.display_name.split(',')[0] || 'Restaurant',
        latitude: selectedPlace.lat,
        longitude: selectedPlace.lon,
        address: selectedPlace.display_name,
      }
    });
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  const onLongPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    console.log("Coordinates", { latitude, longitude });
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <Text style={styles.headerTitle}>Find Restaurants</Text>
        
        {/* Country Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Country</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.countryScrollContainer}
          >
            {countries.map((country) => (
              <TouchableOpacity
                key={country}
                style={[
                  styles.countryChip,
                  selectedCountry === country && styles.countryChipSelected
                ]}
                onPress={() => setSelectedCountry(country)}
              >
                <Text style={[
                  styles.countryChipText,
                  selectedCountry === country && styles.countryChipTextSelected
                ]}>
                  {country}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Restaurant Search */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Restaurant</Text>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={[styles.searchInput, !selectedCountry && styles.searchInputDisabled]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a restaurant"
              placeholderTextColor="#999"
              editable={!!selectedCountry}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoader} />
            )}
          </View>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={result.place_id}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectPlace(result)}
                >
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {result.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {selectedPlace && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.addReviewButton]}
              onPress={handleAddReview}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Add Review</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.viewReviewsButton]}
              onPress={handleViewReviews}
            >
              <Ionicons name="eye-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>View Reviews</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="standard"
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        onLongPress={onLongPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
      >
        {/* Existing markers */}
        {existingMarkers.map(marker => (
          <Marker 
            key={marker.id} 
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            tracksViewChanges={false}
          />
        ))}
        
        {/* Selected place marker */}
        {selectedPlace && (
          <Marker
            coordinate={{
              latitude: parseFloat(selectedPlace.lat),
              longitude: parseFloat(selectedPlace.lon),
            }}
            title={selectedPlace.display_name.split(',')[0]}
            description="Selected Restaurant"
            pinColor="red"
            tracksViewChanges={false}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#25292e',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  countryScrollContainer: {
    flexDirection: 'row',
  },
  countryChip: {
    backgroundColor: '#40454b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  countryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  countryChipText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  countryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#25292e',
  },
  searchInputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  searchLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#25292e',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  addReviewButton: {
    backgroundColor: '#34C759',
  },
  viewReviewsButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  map: {
    flex: 1,
  },
});