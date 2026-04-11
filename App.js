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
  const VUT_MAROON = '         
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
    const message = `I'm here: https:                                               
    Linking.openURL(`'m here: https:                                               
    Linking.openURL(`whatsapp:                                             
  };

  const panicButton = () => {
    if (!location) return Alert.alert(''No GPS'', ''Cannot get location yet');
    const { latitude, longitude } = location.coords;
    const message = `🚨 PANIC ALERT FROM VUT
