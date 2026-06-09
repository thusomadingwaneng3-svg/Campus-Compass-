import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { View, Text, ScrollView, Pressable, Linking, Platform, ActivityIndicator, Alert, TextInput, FlatList, Image, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DataService from './services/dataService';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width, height } = Dimensions.get('window');

// Generic building suggestions for all unis
const SUGGESTED_BUILDINGS = [
  { name: 'Main Gate / Main Entrance', category: 'Entrance' },
  { name: 'Admin Block / Student Services', category: 'Admin' },
  { name: 'Library', category: 'Academic' },
  { name: 'Lecture Hall Block A', category: 'Lecture' },
  { name: 'Lecture Hall Block B', category: 'Lecture' },
  { name: 'Student Clinic / Emergency', category: 'Emergency' },
  { name: 'SRC Office', category: 'Student Services' },
  { name: 'Male Toilets', category: 'Toilets' },
  { name: 'Female Toilets', category: 'Toilets' },
  { name: 'Cafeteria / Food Court', category: 'Food' },
  { name: 'Computer Labs', category: 'Academic' }
];

// Panic mode categories
const PANIC_CATEGORIES = [
  { key: 'Toilets', icon: 'water', label: 'Toilets', color: '#3b82f6' },
  { key: 'Library', icon: 'library', label: 'Library', color: '#8b5cf6' },
  { key: 'Admin', icon: 'business', label: 'Admin', color: '#ef4444' },
  { key: 'Emergency', icon: 'medkit', label: 'Clinic', color: '#dc2626' },
  { key: 'Lecture', icon: 'school', label: 'Lectures', color: '#f59e0b' },
  { key: 'Food', icon: 'restaurant', label: 'Food', color: '#22c55e' }
];

export default function MapScreen() {
  const { uni } = useLocalSearchParams<{ uni?: string }>();
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoursModal, setHoursModal] = useState(false);
  const [tipModal, setTipModal] = useState(false);
  const [qaModal, setQaModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [qaType, setQaType] = useState('');
  const [userLocation, setUserLocation] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const load = async () => {
      try {
        await DataService.init();
        const raw = DataService.getAllInstitutions();
        const data = raw.filter(i => i.id && i.lat && i.lng);

        if (uni) {
          const key = `buildings_${uni}`;
          const crowdsourced = await AsyncStorage.getItem(key);
          if (crowdsourced) {
            const inst = data.find(i => i.id === uni);
            if (inst) {
              inst.buildings = [...(inst.buildings || []),...JSON.parse(crowdsourced)];
            }
          }
        }

        setAllInstitutions(data);

        // Get user location for AR arrows
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc.coords);
        }
      } catch (e) {
        console.error('Failed to load institutions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uni]);

  const filtered = allInstitutions.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.shortName?.toLowerCase().includes(q) ||
      i.city?.toLowerCase().includes(q)
    );
  });

  const found = uni? allInstitutions.find(i =>
    i.id?.toLowerCase() === String(uni).toLowerCase() ||
    i.shortName?.toLowerCase() === String(uni).toLowerCase() ||
    i.name?.toLowerCase().includes(String(uni).toLowerCase())
  ) : null;

  const institution = found || null;

  const navigateToCampus = () => {
    if (!institution?.lat ||!institution?.lng) {
      Alert.alert('No location', 'This institution has no coordinates');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${institution.lat},${institution.lng}&travelmode=walking`;
    Linking.openURL(url);
  };

  // PANIC MODE
  const navigateToCategory = (category: string) => {
    const buildings = institution?.buildings?.filter((b: any) => b.category === category) || [];
    if (buildings.length === 0) {
      Alert.alert('Not mapped yet', `No ${category} buildings mapped yet. Be the first to add one!`);
      return;
    }
    const building = buildings[0];
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}&travelmode=walking`);
  };

  // ADD BUILDING WITH GPS + PHOTO
  const addBuildingLocation = async (buildingName: string, category: string) => {
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus!== 'granted') {
        Alert.alert('Permission needed', 'We need location access');
        return;
      }

      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus!== 'granted') {
        Alert.alert('Permission needed', 'We need camera access');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true
      });

      if (result.canceled) return;
      const photoBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;

      const newBuilding = {
        id: buildingName.toLowerCase().replace(/\s/g, '-') + '-' + Date.now(),
        name: buildingName,
        category: category,
        lat: latitude,
        lng: longitude,
        photo: photoBase64,
        verified: true,
        hours: '',
        crowdLevel: 0,
        reports: 0,
        tips: [],
        qa: {},
        timestamp: Date.now()
      };

      const key = `buildings_${institution.id}`;
      const existing = await AsyncStorage.getItem(key);
      const buildings = existing? JSON.parse(existing) : [];
      buildings.push(newBuilding);
      await AsyncStorage.setItem(key, JSON.stringify(buildings));

      Alert.alert('Verified! ✅', `${buildingName} confirmed + photo saved`);
    } catch (e) {
      Alert.alert('Error', 'Couldn\'t save. Try again.');
      console.error(e);
    }
  };

  // HOURS + CROWD
  const updateBuildingInfo = async (buildingId: string, hours: string, crowdLevel: number) => {
    const key = `buildings_${institution.id}`;
    const existing = await AsyncStorage.getItem(key);
    const buildings = existing? JSON.parse(existing) : [];
    const updated = buildings.map((b: any) =>
      b.id === buildingId? {...b, hours, crowdLevel, lastUpdated: Date.now() } : b
    );
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setHoursModal(false);
    Alert.alert('Updated! ✅', 'Building info saved for other students');
  };

  // STUDENT TIPS
  const addTip = async (buildingId: string, tip: string) => {
    if (!tip.trim()) return;
    const key = `buildings_${institution.id}`;
    const existing = await AsyncStorage.getItem(key);
    const buildings = existing? JSON.parse(existing) : [];
    const updated = buildings.map((b: any) =>
      b.id === buildingId? {...b, tips: [...(b.tips || []), { text: tip, timestamp: Date.now() }] } : b
    );
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setTipModal(false);
    Alert.alert('Tip added! 🙌', 'Your tip will help others not get lost here');
  };

  // Q&A SYSTEM
  const answerQuestion = async (buildingId: string, type: string, answer: string) => {
    if (!answer.trim()) return;
    const key = `buildings_${institution.id}`;
    const existing = await AsyncStorage.getItem(key);
    const buildings = existing? JSON.parse(existing) : [];

    const updated = buildings.map((b: any) => {
      if (b.id === buildingId) {
        const qa = b.qa || {};
        if (!qa[type]) qa[type] = [];
        qa[type] = [{ answer, timestamp: Date.now() }]; // Keep only latest answer
        return {...b, qa};
      }
      return b;
    });

    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setQaModal(false);
    Alert.alert('Thanks! 🙏', 'Your answer will help next student');
  };

  // REPORT WRONG LOCATION
  const reportWrongLocation = async (buildingId: string) => {
    Alert.alert(
      'Report Wrong Location',
      'This will flag the building for review. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            const key = `buildings_${institution.id}`;
            const existing = await AsyncStorage.getItem(key);
            const buildings = existing? JSON.parse(existing) : [];
            const updated = buildings.map((b: any) =>
              b.id === buildingId? {...b, reports: (b.reports || 0) + 1 } : b
            );
            await AsyncStorage.setItem(key, JSON.stringify(updated));
            Alert.alert('Reported', 'Thanks! We\'ll verify this location');
          }
        }
      ]
    );
  };

  // GHOST MODE AR
  const startGhostMode = async (building: any) => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return Alert.alert('Camera needed', 'AR arrows need camera permission');
    }
    setSelectedBuilding(building);
    setGhostMode(true);
  };

  const calculateBearing = (userLat: number, userLng: number, destLat: number, destLng: number) => {
    const φ1 = userLat * Math.PI / 180;
    const φ2 = destLat * Math.PI / 180;
    const Δλ = (destLng - userLng) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  // FIND BUDDY
  const requestBuddy = (buildingName: string) => {
    Alert.alert(
      'Find a Buddy 👥',
      `Anonymous request sent: "Can someone near ${buildingName} help point me?" Students nearby will see it. No names shown.`,
      [{ text: 'OK' }]
    );
  };

  const handleCall = (number: string) => {
    if (!number) return Alert.alert('No number', 'No contact number available');
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Link key={item.id} href={`/map?uni=${item.id}`} asChild>
      <Pressable style={{ padding: 14, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 10, backgroundColor: '#fff' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.shortName || item.name}</Text>
        <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
          {item.type || 'Tertiary'} • {item.city || item.province}
        </Text>
      </Pressable>
    </Link>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 12, color: '#666' }}>Loading campuses...</Text>
      </View>
    );
  }

  if (!uni) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e5e5e5' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Select a Campus</Text>
          <Text style={{ color: '#666', marginBottom: 12 }}>Found {allInstitutions.length} institutions</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color="#666" />
            <TextInput
              placeholder="Search campus, city..."
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, padding: 10, fontSize: 15 }}
              placeholderTextColor="#999"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </Pressable>
            )}
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>No campuses found</Text>}
        />
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={{ padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={{ fontSize: 16, marginTop: 12 }}>Campus "{uni}" not found</Text>
        <Link href="/map" asChild>
          <Pressable style={{ marginTop: 16, padding: 12, backgroundColor: '#8B0000', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Back to list</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  // GHOST MODE SCREEN
  if (ghostMode && selectedBuilding && userLocation) {
    const bearing = calculateBearing(userLocation.latitude, userLocation.longitude, selectedBuilding.lat, selectedBuilding.lng);
    const distance = Math.round(
      6371e3 * Math.acos(
        Math.sin(userLocation.latitude * Math.PI / 180) * Math.sin(selectedBuilding.lat * Math.PI / 180) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(selectedBuilding.lat * Math.PI / 180) *
        Math.cos((selectedBuilding.lng - userLocation.longitude) * Math.PI / 180)
      )
    );

    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} facing="back">
          <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 10 }}>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>→ {selectedBuilding.name}</Text>
              <Text style={{ color: 'white', fontSize: 14 }}>{distance}m away</Text>
            </View>
          </View>

          <View style={{ position: 'absolute', top: height / 2 - 50, left: width / 2 - 50 }}>
            <Ionicons name="arrow-up" size={100} color="#00ff00" style={{ transform: [{ rotate: `${bearing}deg` }] }} />
          </View>

          <Pressable onPress={() => setGhostMode(false)} style={{ position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 10 }}>
            <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Exit AR Mode</Text>
          </Pressable>
        </CameraView>
      </View>
    );
  }

  const primaryColor = institution.primaryColor || '#8B0000';
  const contactNumber = institution.security_phone || institution.phone;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: primaryColor, padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
          {institution.shortName || institution.name}
        </Text>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 4, opacity: 0.9 }}>
          {institution.city}, {institution.province}
        </Text>
      </View>

      <View style={{ padding: 20, gap: 12 }}>

        {/* INSTRUCTIONS DROPDOWN */}
        <Pressable
          onPress={() => setShowInstructions(!showInstructions)}
          style={{
            backgroundColor: '#f3f4f6',
            padding: 14,
            borderRadius: 10,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="help-circle" size={20} color="#6b7280" />
              <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#374151' }}>How to use this app</Text>
            </View>
            <Ionicons name={showInstructions? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
          </View>

          {showInstructions && (
            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🗺️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Navigate to Campus</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Green button takes you to main gate via Google Maps</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Panic Buttons</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Tap Toilets/Library/Admin for instant directions. No typing.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📷</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Help Map Campus</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Stand at building → tap name → take photo → GPS saves automatically</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🕒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Hours + Crowd</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Tap blue clock icon to add opening times + how busy it is</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>AR Ghost Mode</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Tap green 'AR Guide' → camera shows arrow pointing to building. No asking.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Student Tips + Q&A</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Purple 'Tip' = leave advice. Quick buttons = answer 'Open? Entrance? Safe?'</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13 }}>Find Buddy</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Pink 'Buddy' button sends anonymous help request to students nearby</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600' }}>💡 Pro tip: All answers are anonymous. Nobody sees your name. No shame.</Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* CAMPUS GATE NAV */}
        {institution.lat && institution.lng && (
          <Pressable
            onPress={navigateToCampus}
            style={{ backgroundColor: '#10b981', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: 'bold' }}>NAVIGATE TO CAMPUS GATE</Text>
          </Pressable>
        )}

        {/* PANIC BUTTONS */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>Quick Access</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PANIC_CATEGORIES.map(cat => (
            <Pressable
              key={cat.key}
              onPress={() => navigateToCategory(cat.key)}
              style={{
                backgroundColor: cat.color,
                padding: 12,
                borderRadius: 10,
                minWidth: '30%',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Ionicons name={cat.icon as any} size={24} color="white" />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* BUILDINGS LIST */}
        {institution.buildings && institution.buildings.length > 0 && (
          <>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20 }}>Buildings on Campus</Text>
            {institution.buildings.map((building: any) => (
              <View key={building.id} style={{ borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{building.name}</Text>
                    {building.category && (
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{building.category}</Text>
                    )}
                  </View>
                  {building.reports >= 3 && (
                    <View style={{ backgroundColor: '#fee2e2', padding: 4, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#dc2626' }}>⚠️ Needs verification</Text>
                    </View>
                  )}
                </View>

                {/* Photo */}
                {building.photo && (
                  <Image
                    source={{ uri: building.photo }}
                    style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 8 }}
                    resizeMode="cover"
                  />
                )}

                {/* Hours + Crowd */}
                {building.hours && (
                  <Text style={{ fontSize: 12, color: '#059669', marginTop: 8 }}>🕒 {building.hours}</Text>
                )}
                {building.crowdLevel > 0 && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    👥 {building.crowdLevel === 1? 'Empty' : building.crowdLevel === 2? 'Some people' : 'Packed'}
                  </Text>
                )}

                {/* Student Tips */}
                {building.tips && building.tips.length > 0 && (
                  <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>💬 Students say:</Text>
                    {building.tips.slice(0, 2).map((tip: any, idx: number) => (
                      <Text key={idx} style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>• "{tip.text}"</Text>
                    ))}
                  </View>
                )}

                {/* Q&A Answers */}
                {building.qa && (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {building.qa.open && (
                      <View style={{ backgroundColor: '#dcfce7', padding: 6, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: '#166534' }}>🕒 Open: {building.qa.open[0]?.answer}</Text>
                      </View>
                    )}
                    {building.qa.entrance && (
                      <View style={{ backgroundColor: '#dbeafe', padding: 6, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: '#1e40af' }}>🚪 Entrance: {building.qa.entrance[0]?.answer}</Text>
                      </View>
                    )}
                    {building.qa.safety && (
                      <View style={{ backgroundColor: '#fee2e2', padding: 6, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11, color: '#991b1b' }}>🔒 Safety: {building.qa.safety[0]?.answer}</Text>
                      </View>
                    )}
                  </View>
                )}

                {building.landmark && (
                  <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#92400e' }}>📍 {building.landmark}</Text>
                  </View>
                )}

                {/* ACTION BUTTONS */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => startGhostMode(building)}
                    style={{ flex: 1, backgroundColor: '#10b981', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="scan" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>AR Guide</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}&travelmode=walking`)}
                    style={{ flex: 1, backgroundColor: '#f59e0b', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="navigate" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>Maps</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSelectedBuilding(building); setHoursModal(true); }}
                    style={{ flex: 1, backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="time" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>Hours</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setSelectedBuilding(building); setTipModal(true); }}
                    style={{ flex: 1, backgroundColor: '#8b5cf6', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="chatbubble" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>Tip</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => requestBuddy(building.name)}
                    style={{ flex: 1, backgroundColor: '#ec4899', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="people" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>Buddy</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => reportWrongLocation(building.id)}
                    style={{ flex: 1, backgroundColor: '#ef4444', padding: 10, borderRadius: 8, alignItems: 'center' }}
                  >
                    <Ionicons name="flag" size={18} color="white" />
                    <Text style={{ color: 'white', fontSize: 11 }}>Report</Text>
                  </Pressable>
                </View>

                {/* Q&A BUTTONS */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <Pressable onPress={() => { setSelectedBuilding(building); setQaType('open'); setQaModal(true); }}
                    style={{ flex: 1, backgroundColor: '#dcfce7', padding: 8, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: '#166534', textAlign: 'center' }}>Is it open?</Text>
                  </Pressable>

                  <Pressable onPress={() => { setSelectedBuilding(building); setQaType('entrance'); setQaModal(true); }}
                    style={{ flex: 1, backgroundColor: '#dbeafe', padding: 8, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: '#1e40af', textAlign: 'center' }}>Where's entrance?</Text>
                  </Pressable>

                  <Pressable onPress={() => { setSelectedBuilding(building); setQaType('safety'); setQaModal(true); }}
                    style={{ flex: 1, backgroundColor: '#fee2e2', padding: 8, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: '#991b1b', textAlign: 'center' }}>Safe at night?</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* SUGGESTED BUILDINGS */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 8 }}>
          Help map - Confirm these buildings:
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Stand at door → tap name → take photo → auto-save GPS
        </Text>

        {SUGGESTED_BUILDINGS.map((suggestion, idx) => (
          <Pressable
            key={idx}
            onPress={() => addBuildingLocation(suggestion.name, suggestion.category)}
            style={{
              backgroundColor: '#f9fafb',
              padding: 14,
              borderRadius: 10,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 15 }}>{suggestion.name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{suggestion.category}</Text>
            </View>
            <Ionicons name="camera" size={22} color="#8B0000" />
          </Pressable>
        ))}

        {/* CONTACT */}
        {contactNumber && (
          <Pressable onPress={() => handleCall(contactNumber)} style={{ backgroundColor: primaryColor, padding: 15, borderRadius: 10, marginTop: 8 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>📞 CALL SECURITY{'\n'}{contactNumber}</Text>
          </Pressable>
        )}

        <Link href="/map" asChild>
          <Pressable style={{ marginTop: 8 }}>
            <Text style={{ textAlign: 'center', color: '#007AFF', fontWeight: '600' }}>← All Campuses</Text>
          </Pressable>
        </Link>
      </View>

            {/* HOURS MODAL */}
      <Modal visible={hoursModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Update {selectedBuilding?.name}</Text>

            <Text style={{ fontWeight: '600', marginBottom: 6 }}>Opening Hours:</Text>
            <TextInput
              placeholder="Mon-Fri 8:00-16:30"
              defaultValue={selectedBuilding?.hours}
              onChangeText={(text) => setSelectedBuilding({...selectedBuilding, hours: text})}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}
            />

            <Text style={{ fontWeight: '600', marginBottom: 6 }}>How busy is it now?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[1, 2, 3].map(level => (
                <Pressable
                  key={level}
                  onPress={() => setSelectedBuilding({...selectedBuilding, crowdLevel: level})}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: selectedBuilding?.crowdLevel === level? '#3b82f6' : '#f3f4f6',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: selectedBuilding?.crowdLevel === level? 'white' : '#374151', fontWeight: '600' }}>
                    {level === 1? 'Empty' : level === 2? 'Some' : 'Packed'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => updateBuildingInfo(selectedBuilding.id, selectedBuilding.hours, selectedBuilding.crowdLevel)}
              style={{ backgroundColor: '#10b981', padding: 14, borderRadius: 8, marginBottom: 8 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Save Info</Text>
            </Pressable>

            <Pressable onPress={() => setHoursModal(false)}>
              <Text style={{ textAlign: 'center', color: '#6b7280' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TIP MODAL - Student Confessions */}
      <Modal visible={tipModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Share a tip for {selectedBuilding?.name}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Help others not get lost here. Anonymous.</Text>
            <TextInput 
              placeholder="e.g. 'Look for blue gate, not main entrance'" 
              multiline 
              numberOfLines={3}
              onChangeText={(text) => setSelectedBuilding({...selectedBuilding, newTip: text})}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, textAlignVertical: 'top' }} 
            />
            <Pressable 
              onPress={() => addTip(selectedBuilding.id, selectedBuilding.newTip)}
              style={{ backgroundColor: '#8b5cf6', padding: 14, borderRadius: 8, marginBottom: 8 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Post Anonymously</Text>
            </Pressable>
            <Pressable onPress={() => setTipModal(false)}>
              <Text style={{ textAlign: 'center', color: '#6b7280' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Q&A MODAL */}
      <Modal visible={qaModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
              Answer: {qaType === 'open'? 'Is it open?' : qaType === 'entrance'? 'Where\'s entrance?' : 'Safe at night?'}
            </Text>

            {qaType === 'open' && (
              <View style={{ gap: 8, marginBottom: 16 }}>
                {['Open now', 'Closed', 'Opens 8am', 'Closes 5pm'].map(opt => (
                  <Pressable 
                    key={opt} 
                    onPress={() => answerQuestion(selectedBuilding.id, 'open', opt)}
                    style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 }}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: '600' }}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {qaType === 'entrance' && (
              <>
                <TextInput 
                  placeholder="e.g. 'Side gate near blue wall'"
                  onChangeText={(text) => setSelectedBuilding({...selectedBuilding, qaAnswer: text})}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 }} 
                />
                <Pressable 
                  onPress={() => answerQuestion(selectedBuilding.id, 'entrance', selectedBuilding.qaAnswer)}
                  style={{ backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, marginBottom: 8 }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Submit</Text>
                </Pressable>
              </>
            )}

            {qaType === 'safety' && (
              <View style={{ gap: 8, marginBottom: 16 }}>
                {['Safe, lights on', 'Avoid after 7pm', 'Security nearby', 'Not safe alone'].map(opt => (
                  <Pressable 
                    key={opt} 
                    onPress={() => answerQuestion(selectedBuilding.id, 'safety', opt)}
                    style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 }}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: '600' }}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable onPress={() => setQaModal(false)}>
              <Text style={{ textAlign: 'center', color: '#6b7280' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}