import { Text, View, StyleSheet } from 'react-native';
import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewCluster from 'react-native-map-clustering';

export default function MapScreen() {
  // Sample markers data - you'll replace with your actual data
  const markers = [
    { id: 1, coordinate: { latitude: 50.849368721107865, longitude: 4.349104494789498 }, title: "Au Bon Bol", description: "Restaurant chinois" },
    { id: 2, coordinate: { latitude: 50.85033842838263, longitude: 4.350140743969398 }, title: "Ninja House", description: "Restaurant Japonais" },
    // Add more markers here
  ];

  return (
    <View style={styles.container}>
      <MapViewCluster
        style={styles.map}
        mapType="hybrid"
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 50.872986,
          longitude: 4.309333,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onLongPress={(e) => {
          console.log("Coordinates", e.nativeEvent.coordinate);
        }}
        clusterColor="#ff5252"
        clusterTextColor="#ffffff"
        spiralEnabled={true}
        zoomEnabled={true}
      >
        {markers.map(marker => (
          <Marker 
            key={marker.id} 
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
          />
        ))}
      </MapViewCluster>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});