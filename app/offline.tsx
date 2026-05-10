import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function OfflineScreen() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const host = 'localhost';
      const baseUrl = `http://${host}:8081/public/data`;

      const [inst, funding] = await Promise.all([
        fetch(`${baseUrl}/knowledge.json`).then(r => r.json()),
        fetch(`${baseUrl}/funding.json`).then(r => r.json())
      ]);

      await Promise.all([
        AsyncStorage.setItem('cache_institutions', JSON.stringify(inst.institutions)),
        AsyncStorage.setItem('cache_funding', JSON.stringify(funding))
      ]);

      Alert.alert('Done', 'Data saved for offline use');
    } catch (e) {
      Alert.alert('Error', 'Failed to download. Check your connection.');
    }
    setDownloading(false);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="download-outline" size={64} color="#8B0000" />
      <Text style={styles.title}>Download for Offline</Text>
      <Text style={styles.desc}>
        Save institutions and funding data to use without internet.
      </Text>
      <TouchableOpacity 
        style={[styles.btn, downloading && styles.btnDisabled]} 
        onPress={handleDownload}
        disabled={downloading}
      >
        <Text style={styles.btnText}>
          {downloading ? 'Downloading...' : 'Download Data'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  btn: { backgroundColor: '#8B0000', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});