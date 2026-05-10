import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ShareScreen() {
  const handleShare = async () => {
    await Share.share({
      message: 'Check out Campus Compass - Find SA universities, TVET colleges, and funding info. https://campuscompass.co.za',
      title: 'Campus Compass'
    });
  };

  return (
    <View style={styles.container}>
      <Ionicons name="share-social-outline" size={64} color="#10b981" />
      <Text style={styles.title}>Share Campus Compass</Text>
      <Text style={styles.desc}>
        Help other students find the right institution.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={handleShare}>
        <Ionicons name="share-outline" size={20} color="white" />
        <Text style={styles.btnText}>Share App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  btn: { 
    backgroundColor: '#10b981', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});