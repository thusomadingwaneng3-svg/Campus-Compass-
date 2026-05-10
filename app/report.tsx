import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReportScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing info', 'Please fill in subject and message');
      return;
    }

    setSending(true);

    const deviceInfo = `
Device: ${Device.deviceName || 'Unknown'}
OS: ${Device.osName} ${Device.osVersion}
App: Campus Compass
    `;

    const isAvailable = await MailComposer.isAvailableAsync();
    
    if (!isAvailable) {
      Alert.alert('Email not available', 'Please set up an email account on this device');
      setSending(false);
      return;
    }

    await MailComposer.composeAsync({
      recipients: ['support@campuscompass.co.za'],
      subject: `[Report] ${subject}`,
      body: `${message}\n\n---\n${deviceInfo}`,
    });

    setSending(false);
    Alert.alert('Sent', 'Thanks for your feedback!');
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Report a Problem</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief description"
          value={subject}
          onChangeText={setSubject}
          maxLength={100}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe what went wrong..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity 
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={sending}
        >
          <Ionicons name="send" size={20} color="white" />
          <Text style={styles.sendBtnText}>
            {sending ? 'Sending...' : 'Send Report'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Reports go to support@campuscompass.co.za. 
          We’ll reply within 24 hours.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  textarea: { minHeight: 120 },
  sendBtn: { 
    flexDirection: 'row',
    backgroundColor: '#8B0000', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  note: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 16 }
});