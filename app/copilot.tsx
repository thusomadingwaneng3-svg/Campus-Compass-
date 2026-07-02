import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Msg = { role: 'user' | 'ai'; text: string };

export default function Copilot() {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Hey 👋 I’m Thuso AI. Send me: APS, NBT, course, budget, province. I’ll match you to unis + bursaries.' }
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', text: input };
    setMsgs(m => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: 'ai', text: data.reply || 'No matches found. Try different filters.' }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'ai', text: 'Failed to connect. Check internet.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios'? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(_, i) => i + ''}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user'? 'flex-end' : 'flex-start', marginVertical: 6, maxWidth: '85%' }}>
            <LinearGradient
              colors={item.role === 'user'? ['#8B0000', '#C44569'] : ['#F3F4F6', '#E5E7EB']}
              style={{ padding: 12, borderRadius: 16 }}
            >
              <Text style={{ color: item.role === 'user'? 'white' : '#111', fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
            </LinearGradient>
          </View>
        )}
      />
      {loading && <ActivityIndicator style={{ marginBottom: 8 }} color="#8B0000" />}
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="APS 38, Engineering, Gauteng, <R50k..."
          style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 }}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={send} disabled={loading} style={{ backgroundColor: '#8B0000', borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center' }}>
          <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 15 }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}