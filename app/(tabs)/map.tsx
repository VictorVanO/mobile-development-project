import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

// Define types for marker
interface MarkerData {
  id: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region>({
    latitude: 50.872986, // Brussels coordinates
    longitude: 4.309333,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  // Sample markers data
  const markers: MarkerData[] = [
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
    { 
      id: 3, 
      coordinate: { latitude: 51.50389211071925, longitude: -0.14854462660657064 }, 
      title: "Hard Rock Cafe", 
      description: "Restaurant américain" 
    },
  ];

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  const onLongPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    console.log("Coordinates", { latitude, longitude });
    Alert.alert(
      "Location Selected",
      `Latitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}`,
      [{ text: "OK" }]
    );
  };

  const onMarkerPress = (marker: MarkerData) => {
    Alert.alert(
      marker.title,
      marker.description || "Restaurant",
      [
        { text: "Cancel", style: "cancel" },
        { text: "View Reviews", onPress: () => console.log("Navigate to reviews") },
        { text: "Add Review", onPress: () => console.log("Navigate to add review") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Restaurants</Text>
        <Text style={styles.headerSubtitle}>Tap and hold to select a location</Text>
      </View>
      
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
        showsScale={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
      >
        {markers.map(marker => (
          <Marker 
            key={marker.id} 
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => onMarkerPress(marker)}
            // Performance optimization
            tracksViewChanges={false}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    backgroundColor: '#25292e',
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ccc',
  },
  map: {
    flex: 1,
  },
});