import React, { useState } from 'react';
import {
  StyleSheet, View, TouchableOpacity, Text, Linking, Alert, ScrollView,
  TextInput, ActivityIndicator, Modal, SectionList, Pressable
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// T 💙 PASTE YOUR NEW HUGGING FACE TOKEN HERE - NEVER SHARE IT
const HF_TOKEN = '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';

export default function App() {
  const [mapType, setMapType] = useState('standard');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVUTModal, setShowVUTModal] = useState(false); // T 💙 NEW: VUT popup state

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

  // T 💙 NEW: VUT OFFICES DATA FROM YOUR SCREENSHOTS
  const vutOffices = [
    {
      title: 'Student & Academic Support',
      data: [
        { name: 'General Student Enquiries', email: 'studentenquiries@vut.ac.za' },
        { name: 'Work Integrated Learning (WIL)', email: 'WILregistration@vut.ac.za' },
        { name: 'Masters/Doctorate Registration', email: 'faithmn@vut.ac.za' },
        { name: 'Academic Appeals', email: 'appealapp@vut.ac.za' },
      ],
    },
    {
      title: 'Faculty Administration',
      data: [
        { name: 'FMS - Executive Dean', email: 'chengedzai@vut.ac.za', ext: '6886' },
        { name: 'FMS - Head Admin', email: 'selinah@vut.ac.za', ext: '6878' },
        { name: 'FMS - Senior Admin', email: 'thorisom@vut.ac.za', ext: '6876' },
        { name: 'FACS', email: 'fucs@vut.ac.za', ext: '6690' },
      ],
    },
    {
      title: 'Research & Innovation',
      data: [
        { name: 'DVC Research & Innovation', email: 'leratoh@vut.ac.za' },
        { name: 'Research Development', email: 'son@vut.ac.za' },
        { name: 'Research Administration', email: 'ronela@vut.ac.za' },
        { name: 'NRF Financial Officer', email: 'thakasilen@vut.ac.za' },
        { name: 'Postgraduate Admin', email: 'beatricet@vut.ac.za' },
      ],
    },
    {
      title: 'Human Resources',
      data: [
        { name: 'Employee Relations - Tshepo Thekiso', email: 'tshepoth@vut.ac.za' },
        { name: 'Employee Relations - John Sello', email: 'johns2@vut.ac.za' },
        { name: 'OD & Performance', email: 'tsilisol@vut.ac.za' },
        { name: 'HR Business Analyst', email: 'traceyv@vut.ac.za' },
        { name: 'Benefits/Remuneration', email: 'thembi@vut.ac.za' },
        { name: 'Benefits/Retirement', email: 'joane@vut.ac.za' },
      ],
    },
    {
      title: 'Other Services',
      data: [
        { name: 'IT Staff Services', email: 'it_support@vut.ac.za' },
        { name: 'General Info/Reception', email: 'reception@vut.ac.za' },
      ],
    },
  ];

  const openEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

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
    if (!HF_TOKEN || HF_TOKEN === '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') {
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

        {/* T 💙 NEW: VUT OFFICES BUTTON */}
        <TouchableOpacity style={[styles.button, styles.vutBlue]} onPress={() => setShowVUTModal(true)}>
          <Text style={styles.buttonText}>VUT Offices & Emails</Text>
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

      {/* T 💙 NEW: VUT OFFICES MODAL */}
      <Modal
        visible={showVUTModal}
        animationType="slide"
        onRequestClose={() => setShowVUTModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>VUT Offices</Text>
            <Pressable onPress={() => setShowVUTModal(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.hours}>Mon-Fri: 07:45 - 16:30</Text>
          <SectionList
            sections={vutOffices}
            keyExtractor={(item, index) => item.email + index}
            renderItem={({ item }) => (
              <Pressable style={styles.officeItem} onPress={() => openEmail(item.email)}>
                <Text style={styles.officeName}>{item.name}</Text>
                <Text style={styles.officeEmail}>{item.email}</Text>
                {item.ext && <Text style={styles.officeExt}>Ext: {item.ext}</Text>}
              </Pressable>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
          />
        </View>
      </Modal>
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
  map: { height: 200 },
  buttonContainer: { padding: 12, backgroundColor: 'yellow', flex: 1 },
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
  vutBlue: { backgroundColor: '#0033A0' }, // T 💙 NEW: VUT brand blue
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
  // T 💙 NEW: VUT MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#8B0000',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  hours: {
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#f2f2f2',
    fontStyle: 'italic',
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#E8E8E8',
    padding: 12,
    color: '#8B0000',
  },
  officeItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  officeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  officeEmail: {
    fontSize: 14,
    color: '#1E90FF',
    marginTop: 3,
  },
  officeExt: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});