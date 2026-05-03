import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

const WHATSAPP_NUMBER = '27686680098';
const ACCOUNT_NUMBER = '1731868152';
const BANK_DETAILS = `Bank: Capitec\nAccount: ${ACCOUNT_NUMBER}\nAmount: R5.00\nRef: Your phone number`;
const ACTIVATION_CODE = 'THUSO2026';

export default function ProScreen() {
  const [userIsPro, setUserIsPro] = useState(false);
  const [code, setCode] = useState('');
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    checkProStatus();
  }, []);

  const checkProStatus = async () => {
    const pro = await AsyncStorage.getItem('isPro');
    setUserIsPro(pro === 'true');
  };

  const copyBankDetails = async () => {
    await Clipboard.setStringAsync(BANK_DETAILS);
    Alert.alert(
      'Details Copied',
      `EFT R5 to Capitec ${ACCOUNT_NUMBER}\n\nAfter paying, WhatsApp screenshot to 068 668 0098 for your activation code.`,
      [{ text: 'OK' }]
    );
  };

  const restorePro = async () => {
    if (code.trim().toUpperCase() === ACTIVATION_CODE) {
      await AsyncStorage.setItem('isPro', 'true');
      setUserIsPro(true);
      Alert.alert('Pro Activated!', 'Restart the app to unlock unlimited searches and saves.');
      setCode('');
      setShowRestore(false);
    } else {
      Alert.alert('Invalid Code', 'WhatsApp your payment proof to 068 668 0098 to get your code.');
    }
  };

  if (userIsPro) {
    return (
      <SafeAreaView style={styles.proContainer}>
        <View style={styles.centerContent}>
          <Ionicons name="star" size={64} color="#facc15" />
          <Text style={styles.proHeader}>👑 Pro Member</Text>
          <Text style={styles.proSubheader}>Unlimited Access Unlocked</Text>
          <View style={styles.proCard}>
            <Text style={styles.proFeature}>✅ Unlimited AI Questions</Text>
            <Text style={styles.proFeature}>✅ Save Unlimited Bursaries</Text>
            <Text style={styles.proFeature}>✅ Priority Reminders</Text>
            <Text style={styles.proFeature}>✅ No Ads Forever</Text>
            <Text style={styles.proFeature}>✅ All 75 Institutions</Text>
          </View>
          <Text style={styles.supportText}>Thank you for supporting Campus Compass</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.proContainer}>
      <ScrollView contentContainerStyle={styles.centerContent}>
        <Ionicons name="star-outline" size={64} color="#facc15" />
        <Text style={styles.proHeader}>Upgrade to Pro</Text>
        <Text style={styles.proSubheader}>Support Campus Compass for R5/month</Text>
        
        <View style={styles.proCard}>
          <Text style={styles.price}>R5<Text style={styles.perMonth}>/month</Text></Text>
          <Text style={styles.proFeature}>✅ Unlimited AI Questions</Text>
          <Text style={styles.proFeature}>✅ Save Unlimited Bursaries</Text>
          <Text style={styles.proFeature}>✅ Priority Reminders</Text>
          <Text style={styles.proFeature}>✅ No Ads Forever</Text>
          <Text style={styles.proFeature}>✅ Support SA Student Dev</Text>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Pay with Capitec</Text>
          <Text style={styles.paymentText}>EFT R5 to: {ACCOUNT_NUMBER}</Text>
          <Text style={styles.paymentText}>Ref: Your phone number</Text>
        </View>

        <TouchableOpacity style={styles.upgradeButton} onPress={copyBankDetails}>
          <Ionicons name="copy-outline" size={20} color="#111827" />
          <Text style={styles.upgradeButtonText}> Copy Bank Details</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowRestore(!showRestore)}>
          <Text style={styles.restoreLink}>Already paid? Enter activation code</Text>
        </TouchableOpacity>

        {showRestore && (
          <View style={styles.restoreBox}>
            <TextInput
              style={styles.input}
              placeholder="Enter code from WhatsApp"
              placeholderTextColor="#6b7280"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.activateBtn} onPress={restorePro}>
              <Text style={styles.activateText}>Activate Pro</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.secureText}>
          WhatsApp proof to 068 668 0098. You keep access till month end. Cancel anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  proContainer: { flex: 1, backgroundColor: '#111827' },
  centerContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  proHeader: { fontSize: 32, fontWeight: 'bold', color: '#facc15', marginBottom: 8, marginTop: 16 },
  proSubheader: { fontSize: 16, color: '#9ca3af', marginBottom: 24, textAlign: 'center' },
  proCard: { backgroundColor: '#1f2937', padding: 24, borderRadius: 16, width: '100%', marginBottom: 24 },
  price: { fontSize: 36, color: 'white', fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  perMonth: { fontSize: 18, color: '#9ca3af' },
  proFeature: { fontSize: 16, color: '#d1d5db', marginTop: 12 },
  paymentBox: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: '#374151' },
  paymentTitle: { fontSize: 16, fontWeight: 'bold', color: '#facc15', marginBottom: 8, textAlign: 'center' },
  paymentText: { fontSize: 14, color: '#d1d5db', textAlign: 'center', marginBottom: 4 },
  upgradeButton: { backgroundColor: '#facc15', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  upgradeButtonText: { color: '#111827', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginLeft: 8 },
  restoreLink: { color: '#facc15', fontSize: 14, marginTop: 16, textDecorationLine: 'underline' },
  restoreBox: { width: '100%', marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8, backgroundColor: '#1f2937', color: 'white' },
  activateBtn: { backgroundColor: '#facc15', padding: 12, borderRadius: 8, alignItems: 'center' },
  activateText: { color: '#111827', fontWeight: 'bold', fontSize: 16 },
  secureText: { fontSize: 12, color: '#6b7280', marginTop: 16, textAlign: 'center', lineHeight: 18 },
  supportText: { fontSize: 14, color: '#9ca3af', marginTop: 16 }
});