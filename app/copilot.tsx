import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech'; // Works on web + mobile

type Msg = { role: 'user' | 'ai'; text: string };
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://campus-compass-thuso.vercel.app';

export default function Copilot() {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: 'Hey 👋 I’m Thuso AI Pro. Ask anything. Web = text only. Mobile = hold mic 🎤' }]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    setMsgs(m => [...m, { role: 'user', text }]);
    setInput(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/copilot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) });
      const data = await res.json();
      setMsgs(m => [...m, { role: 'ai', text: data.reply }]);
      Speech.speak(data.reply, { language: 'en-ZA' }); // Voice out works on web
    } catch { setMsgs(m => [...m, { role: 'ai', text: 'Failed to connect.' }]); }
    finally { setLoading(false); setTimeout(() => listRef.current?.scrollToEnd(), 100); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios'? 'padding' : undefined}>
      <FlatList ref={listRef} data={msgs} keyExtractor={(_, i) => i + ''} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user'? 'flex-end' : 'flex-start', marginVertical: 6, maxWidth: '85%' }}>
            <LinearGradient colors={item.role === 'user'? ['#8B0000', '#C44569'] : ['#F3F4F6', '#E5E7EB']} style={{ padding: 12, borderRadius: 16 }}>
              <Text style={{ color: item.role === 'user'? 'white' : '#111', fontSize: 15 }}>{item.text}</Text>
            </LinearGradient>
          </View>
        )}
      />
      {loading && <ActivityIndicator color="#8B0000" />}
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', gap: 8 }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Ask anything..." style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24, paddingHorizontal: 16 }} onSubmitEditing={() => send()} />
        <TouchableOpacity onPress={() => send()} style={{ backgroundColor: '#8B0000', borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center' }}>
          <Text style={{ color: '#FFD700', fontWeight: '800' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}