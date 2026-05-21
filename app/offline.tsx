import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://campus-compass-thuso.vercel.app/data';

export default function OfflineScreen() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [instRes, fundingRes] = await Promise.all([
        fetch(`${BASE_URL}/knowledge.json`),
        fetch(`${BASE_URL}/funding.json`)
      ]);

      if (!instRes.ok || !fundingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const institutions = await instRes.json();
      const funding = await fundingRes.json();

      await Promise.all([
        AsyncStorage.setItem('cache_institutions', JSON.stringify(institutions)),
        AsyncStorage.setItem('cache_funding', JSON.stringify(funding)),
        AsyncStorage.setItem('cache_last_updated', new Date().toISOString())
      ]);

      Alert.alert('Done ✅', 'Data saved for offline use');
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to download. Check your internet connection.');
    } finally {
      setDownloading(false);
    }
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
        {downloading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnText}>Download Data</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        Uses ~2-5MB of storage. Update anytime with Sync Data.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#f9fafb' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginTop: 16 
  },
  desc: { 
    fontSize: 14, 
    color: '#6b7280', 
    textAlign: 'center', 
    marginTop: 8, 
    marginBottom: 24 
  },
  btn: { 
    backgroundColor: '#8B0000', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center'
  },
  btnDisabled: { 
    opacity: 0.6 
  },
  btnText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  note: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center'
  }
});