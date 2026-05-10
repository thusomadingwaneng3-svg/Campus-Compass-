import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SyncScreen() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await AsyncStorage.removeItem('cache_institutions');
      await AsyncStorage.removeItem('cache_funding');
      Alert.alert('Synced', 'Cache cleared. App will reload fresh data next time.');
    } catch (e) {
      Alert.alert('Error', 'Failed to sync');
    }
    setSyncing(false);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="refresh-circle-outline" size={64} color="#2563eb" />
      <Text style={styles.title}>Sync Data</Text>
      <Text style={styles.desc}>
        Clear cached data to force a fresh download from the server.
      </Text>
      <TouchableOpacity 
        style={[styles.btn, syncing && styles.btnDisabled]} 
        onPress={handleSync}
        disabled={syncing}
      >
        <Text style={styles.btnText}>
          {syncing ? 'Syncing...' : 'Clear Cache & Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});