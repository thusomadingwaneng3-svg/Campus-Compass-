import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Linking, Platform, Modal, Image, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [showCampusMap, setShowCampusMap] = useState(false);

  // VUT Campus Coordinates
  const VUT_LAT = -26.7117;
  const VUT_LNG = 27.9381;

  // VUT Official Colors
  const VUT_MAROON = '#6C0A0A';
  const VUT_GOLD = '#FFC72C';

  // Emergency Assembly Points - approximate coords from your map
  const emergencyPoints = [
    { id: 'A', name: 'Assembly Point A', lat: -26.7105, lng: 27.9388, desc: 'Near Student Parking' },
    { id: 'B', name: 'Assembly Point B', lat: -26.7120, lng: 27.9365, desc: 'Main Gate - Andries Potgieter Blvd' },
    { id: 'C', name: 'Assembly Point C', lat: -26.7128, lng: 27.9395, desc: 'East Side' },
    { id: 'D', name: 'Assembly Point D', lat: -26.7132, lng: 27.9380, desc: 'South Student Parking' },
  ];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const navigateToVUT = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=VUT@${VUT_LAT},${VUT_LNG}`,
      android: `google.navigation:q=${VUT_LAT},${VUT_LNG}`
    });
    Linking.openURL(url);
  };

  const shareLocation = async () => {
    if (!location) return Alert.alert('No Location', 'Waiting for GPS...');
    const { latitude, longitude } = location.coords;
    const message = `I'm here: https://maps.google.com/?q=${latitude},${longitude}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const panicButton = () => {
    if (!location) return Alert.alert('No GPS', 'Cannot get location yet');
    const { latitude, longitude } = location.coords;
    const message = `🚨 PANIC ALERT FROM VUT STUDENT 🚨\nI need help! My location: https://maps.google.com/?q=${latitude},${longitude}`;
    Alert.alert(
      'PANIC MODE',
      'Send your location to emergency contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send via WhatsApp', onPress: () => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`) },
        { text: 'Call Campus Security', onPress: () => Linking.openURL('tel:0169509911') }
      ]
    );
  };

  const navigateToAssemblyPoint = (point) => {
    const url = `google.navigation:q=${point.lat},${point.lng}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: VUT_MAROON }]}>
        <Text style={[styles.headerText, { color: VUT_GOLD }]}>VUT Campus Compass</Text>
      </View>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: VUT_LAT,
          longitude: VUT_LNG,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        showsUserLocation={true}
      >
        <Marker
          coordinate={{ latitude: VUT_LAT, longitude: VUT_LNG }}
          title="VUT Main Campus"
          pinColor={VUT_MAROON}
        />
        {emergencyPoints.map(point => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lng }}
            title={point.name}
            description={point.desc}
            pinColor="green"
            onCalloutPress={() => navigateToAssemblyPoint(point)}
          />
        ))}
      </MapView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, { backgroundColor: VUT_MAROON }]} onPress={navigateToVUT} >
          <Text style={[styles.buttonText, { color: VUT_GOLD }]}>Navigate to VUT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: VUT_GOLD }]} onPress={() => setShowCampusMap(true)} >
          <Text style={[styles.buttonText, { color: VUT_MAROON }]}>View Campus Layout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#008000' }]} onPress={shareLocation} >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Share My Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.panicButton]} onPress={panicButton} >
          <Text style={styles.panicText}>🚨 PANIC BUTTON 🚨</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showCampusMap} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: VUT_MAROON }]}>
            <Text style={[styles.headerText, { color: VUT_GOLD }]}>Emergency Assembly Points</Text>
            <TouchableOpacity onPress={() => setShowCampusMap(false)}>
              <Text style={[styles.closeButton, { color: VUT_GOLD }]}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Image 
              source={{ uri: 'https://i.imgur.com/4zQ7m2k.png' }} 
              style={styles.campusMapImage} 
              resizeMode="contain" 
            />
            <Text style={styles.mapNote}>
              Green pins on map = Assembly Points. Tap any green pin to navigate there.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 15, alignItems: 'center' },
  headerText: { fontSize: 22, fontWeight: 'bold' },
  map: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  button: { padding: 14, borderRadius: 12, marginBottom: 8, alignItems: 'center', elevation: 5 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  panicButton: { backgroundColor: '#FF0000', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 8 },
  panicText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeButton: { fontSize: 18, fontWeight: 'bold' },
  campusMapImage: { width: '100%', height: 600 },
  mapNote: { padding: 15, fontSize: 14, textAlign: 'center', color: '#333' }
});
