import { Text, View, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MapViewCluster from 'react-native-map-clustering';

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
  const [region, setRegion] = useState<Region>({
    latitude: 51.0, // Center initially between London and Brussels
    longitude: 2.0,
    latitudeDelta: 8, // Start with a wider view to see both cities
    longitudeDelta: 8,
  });
  
  // Define all your markers
  const markers: MarkerData[] = [
    { id: 1, coordinate: { latitude: 50.849368721107865, longitude: 4.349104494789498 }, title: "Au Bon Bol", description: "Restaurant chinois" },
    { id: 2, coordinate: { latitude: 50.85033842838263, longitude: 4.350140743969398 }, title: "Ninja House", description: "Restaurant japonais" },
    { id: 3, coordinate: { latitude: 51.50389211071925, longitude: -0.14854462660657064 }, title: "Hard Rock Cafe", description: "Restaurant américain" },
  ];

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <View style={styles.container}>
      <MapViewCluster
        style={styles.map}
        mapType="hybrid"
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        clusterColor="#ff5252"
        clusterTextColor="#ffffff"
        spiralEnabled={true}
        zoomEnabled={true}
        // Key clustering parameters
        radius={40} // Clustering radius in pixels
        extent={512} // Cluster area
        nodeSize={16} // Size of the KD-tree node
        minZoom={1} // Min zoom level for clustering
        maxZoom={20} // Max zoom level for clustering
        preserveClusterPressBehavior={true} // Important for proper cluster behavior
        spiderLineColor="#FF0000" // Spider line color when cluster is pressed
      >
        {markers.map(marker => (
          <Marker 
            key={marker.id} 
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            tracksViewChanges={false} // Performance optimization
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
  map: {
    width: '100%',
    height: '100%',
  },
});