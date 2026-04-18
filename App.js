import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Linking, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// T 💙 PASTE YOUR NEW HUGGING FACE TOKEN HERE - NEVER SHARE IT
const HF_TOKEN = 'hf_awZgT1ETGhJzCsKeDIfxiGfktyDhppzg1f';

export default function App() {
  const [mapType, setMapType] = useState('standard');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const VUT_COORDS = { latitude: -26.7028, longitude: 27.8405 };

  const vutLocations = [
    { name: 'Main Gate', coords: { latitude: -26.6990, longitude: 27.8410 } },
    { name: 'Campus Clinic', coords: { latitude: -26.7035, longitude: 27.8390 } },
    { name: 'Library', coords: { latitude: -26.7020, longitude: 27.8400 } },
    { name: 'Engineering Building', coords: { latitude: -26.7040, longitude: 27.8420 } },
    { name: 'Student Centre', coords: { latitude: -26.7025, longitude: 27.8415 } },
  ];

  const emergencyContacts = [
    { name: 'Protection Services - Control Room', number: '0169509111' },
    { name: 'Protection Services - Main Gate', number: '0169503911' },
    { name: 'VUT Clinic', number: '0169509484' },
    { name: 'Counselling Services', number: '0169509080' },
    { name: 'Disability Unit', number: '0169509277' },
    { name: 'Maintenance Hotline', number: '0169509098' },
    { name: 'SAPS 10111', number: '10111' },
    { name: 'Emergency Services 112', number: '112' },
    { name: 'Ambulance 10177', number: '10177' },
  ];

  const handleNavigate = () => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${VUT_COORDS.latitude},${VUT_COORDS.longitude}`);
  };

  const handleViewLayout = () => {
    setMapType(mapType === 'satellite'? 'standard' : 'satellite');
  };

  const handleShareLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status!== 'granted') {
      Alert.alert('Permission needed', 'We need location to share it');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const message = `My current location at VUT: ${mapsUrl}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
  };

  const handlePanic = async () => {
    Linking.openURL('tel:0169509111');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const smsBody = `EMERGENCY AT VUT. My location: ${mapsUrl}. Please send help.`;
        Linking.openURL(`sms:0169509111?body=${encodeURIComponent(smsBody)}`);
      }
    } catch (e) {}
  };

  // T 💙 Hugging Face AI
  const askCampusAI = async () => {
    if (!question.trim()) {
      Alert.alert('Ask something', 'Type your question about VUT first');
      return;
    }
    if (!HF_TOKEN || HF_TOKEN === 'PASTE_NEW_HF_TOKEN_HERE') {
      Alert.alert('Setup needed', 'Add your Hugging Face token on line 7');
      return;
    }

    setLoading(true);
    try {
      const context = `You are VUT Campus Compass AI for Vaal University of Technology students.
      Key locations: ${vutLocations.map(l => l.name).join(', ')}.
      Emergency: Protection Services 0169509111, Main Gate 0169503911, Clinic 0169509484, SAPS 10111.
      Keep answers short, helpful, and specific to VUT. If it's an emergency, tell them to use the PANIC BUTTON.
      Question: ${question}`;

      const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: context,
          parameters: { max_new_tokens: 150, return_full_text: false }
        })
      });

      const data = await res.json();

      if (data.error) {
        if (data.error.includes('loading')) {
          Alert.alert('Campus AI', 'The AI is starting up. Try again in 20 seconds.');
        } else {
          Alert.alert('Campus AI', 'AI is offline. For emergencies use the PANIC BUTTON or call 10111.');
        }
      } else {
        const answer = data[0]?.generated_text || 'No answer. Try rephrasing your question.';
        Alert.alert('Campus AI', answer.trim());
        setQuestion('');
      }
    } catch (e) {
      Alert.alert('Error', 'No internet. For emergencies call 10111.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>VUT Campus Compass</Text>
        <Text style={styles.subHeader}>Vaal University of Technology</Text>
      </View>

      <MapView
        style={styles.map}
        provider="google"
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsBuildings={true}
        pitchEnabled={true}
        rotateEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        initialCamera={{
          center: { latitude: -26.7028, longitude: 27.8405 },
          pitch: 60,
          heading: 0,
          zoom: 17,
        }}
      >
        {vutLocations.map((loc, i) => (
          <Marker
            key={i}
            coordinate={loc.coords}
            title={loc.name}
            description="Tap for directions"
            onCalloutPress={() => {
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${loc.coords.latitude},${loc.coords.longitude}`);
            }}
          />
        ))}
      </MapView>

      <ScrollView style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.maroon]} onPress={handleNavigate}>
          <Text style={styles.buttonText}>Navigate to VUT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.gold]} onPress={handleViewLayout}>
          <Text style={styles.buttonText}>Toggle Map View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.green]} onPress={handleShareLocation}>
          <Text style={styles.buttonText}>Share My Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.red]} onPress={handlePanic}>
          <Text style={styles.buttonText}>🚨 PANIC BUTTON 🚨</Text>
        </TouchableOpacity>

        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.emergencyNumberBtn}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}>
            <Text style={styles.emergencyNumberText}>{contact.name}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.aiTitle}>Ask Campus AI</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Where is the clinic? Is library open?"
          placeholderTextColor="#999"
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <TouchableOpacity style={[styles.button, styles.blue]} onPress={askCampusAI} disabled={loading}>
          {loading? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ask Campus AI</Text>}
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#8B0000',
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700'
  },
  headerText: { color: '#FFD700', fontSize: 22, fontWeight: 'bold' },
  subHeader: { color: '#fff', fontSize: 14, marginTop: 2 },
  map: { height: 200 }, // T 💙 FIXED: was flex: 1
  buttonContainer: { padding: 12, backgroundColor: 'yellow', flex: 1 }, // T 💙 FIXED: was maxHeight: 420
  button: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 17 },
  maroon: { backgroundColor: '#8B0000' },
  gold: { backgroundColor: '#FFD700' },
  green: { backgroundColor: '#228B22' },
  red: { backgroundColor: '#DC143C' },
  blue: { backgroundColor: '#1E90FF' },
  emergencyNumberBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  emergencyNumberText: {
    color: '#8B0000',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    minHeight: 45,
    fontSize: 16
  },
});