import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

export default function AmbassadorScreen() {
  const [campus, setCampus] = useState('');
  const [update, setUpdate] = useState('');

  const submitUpdate = async () => {
    // Send to Supabase table 'campus_updates'
    // You review and approve before it goes live
    Alert.alert('Thanks!', 'Update submitted for review');
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Update Your Campus</Text>
      <TextInput 
        placeholder="Campus Name" 
        value={campus} 
        onChangeText={setCampus}
        style={{ borderWidth: 1, padding: 10, marginTop: 10, borderRadius: 8 }}
      />
      <TextInput 
        placeholder="What changed? Deadline, contact, etc." 
        value={update} 
        onChangeText={setUpdate}
        multiline
        style={{ borderWidth: 1, padding: 10, marginTop: 10, borderRadius: 8, height: 100 }}
      />
      <TouchableOpacity 
        onPress={submitUpdate}
        style={{ backgroundColor: '#8B0000', padding: 14, borderRadius: 8, marginTop: 20 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          Submit Update
        </Text>
      </TouchableOpacity>
      <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
        Earn R50 airtime for every approved update
      </Text>
    </View>
  );
}