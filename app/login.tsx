import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { useAuth } from '../lib/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const { signInWithOTP } = useAuth();

  const sendCode = async () => {
    try {
      await signInWithOTP(email);
      setSent(true);
      Alert.alert('Check your email', 'We sent you a login code');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20 }}>
        Login to Campus Compass
      </Text>
      
      <TextInput
        placeholder="email@student.ac.za"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 }}
      />

      {sent && (
        <TextInput
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          style={{ borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
      )}

      <Button title={sent ? "Verify Code" : "Send Code"} onPress={sendCode} />
    </View>
  );
}