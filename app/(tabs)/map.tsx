import { Text, View, StyleSheet } from 'react-native';
import React from 'react';
import MapView, { Marker } from 'react-native-maps'; //! Only works on mobile
import MapViewCluster from 'react-native-map-clustering';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapType="hybrid"  
        initialRegion={{
          latitude: 50.872986,
          longitude: 4.309333,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{ latitude: 50.849368721107865, longitude: 4.349104494789498 }}
          title="Au Bon Bol"
          description="Restaurant chinois"
        />
        <Marker
          coordinate={{ latitude: 37.75825, longitude: -122.4624 }}
          title="Marker 2"
        />
        <MapView
          style={styles.map}
          onLongPress={(e) => {
            console.log("Coordinates", e.nativeEvent.coordinate);
          }}
        />
      </MapView>
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
