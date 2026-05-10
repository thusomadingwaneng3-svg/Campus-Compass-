import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native-web';

type Bursary = {
  id: string;
  name: string;
  provider: string;
  type: string;
  fields: string[];
  deadline: string;
  link: string;
  requirements: string[];
  benefits: string[];
  contact?: string;
  minAPS?: number;
  incomeCap?: number;
};

type ChatMessage = { role: 'user' | 'ai'; text: string };

export default function BursaryScreen() {
  const [SA_BURSARIES, setBursaries] = useState<Bursary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Bursary | null>(null);
  
  // AI Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Hi! I\'m Campus Compass AI. Ask me about NSFAS, Funza, UJ deadlines, APS, anything.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch('/data/funding.json')
      .then(res => res.json())
      .then((fundingData) => {
        const mapped: Bursary[] = fundingData.map((item: any) => ({
          id: item.id,
          name: item.name,
          provider: item.provider,
          type: item.type,
          fields: item.fields,
          deadline: item.deadline,
          link: item.apply_link,
          requirements: [
            item.requirements,
            item.income_threshold !== "Not specified" ? `Income threshold: ${item.income_threshold}` : null
          ].filter(Boolean) as string[],
          benefits: item.covers,
          contact: item.notes,
          incomeCap: item.income_threshold?.includes('R350,000') ? 350000 : 
                     item.income_threshold?.includes('R600,000') ? 600000 : undefined
        }));
        setBursaries(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.log('Failed to load bursaries', err);
        setLoading(false);
      });
  }, []);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          bursaries: SA_BURSARIES.slice(0, 10) // Send top 10 to save tokens
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply || 'Sorry, I had an error.' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'AI is offline. Try again later.' }]);
    }
    setAiLoading(false);
  };

  const fields = ['All', 'Engineering', 'Teaching', 'IT', 'Health', 'Commerce', 'Science', 'STEM'];
  
  const filtered = SA_BURSARIES.filter(b => 
    (filter === 'All' || b.fields.some(f => f.includes(filter)) || b.fields.includes('All')) &&
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#7C3AED" />
        <Text style={{ color: '#E0D6FF', marginTop: 12 }}>Loading bursaries...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', padding: 16 }}>
      <Text style={{ color: '#E0D6FF', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        SA Bursaries 💰 ({SA_BURSARIES.length} loaded)
      </Text>

      <TextInput
        placeholder="Search NSFAS, Funza, SASOL..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
        style={{ backgroundColor: '#1A1A1A', color: '#FFF', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#7C3AED' }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginBottom: 16 }}>
        {fields.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={{ 
              backgroundColor: filter === f ? '#7C3AED' : '#1A1A1A', 
              paddingHorizontal: 16, paddingVertical: 8, 
              borderRadius: 20, marginRight: 8, height: 36
            }}>
            <Text style={{ color: filter === f ? '#FFF' : '#A78BFA' }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView>
        {filtered.map((b) => (
          <TouchableOpacity key={b.id} onPress={() => setSelected(b)}
            style={{ backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 16, flex: 1 }}>{b.name}</Text>
              <Text style={{ color: '#7C3AED', fontSize: 12 }}>{b.type}</Text>
            </View>
            <Text style={{ color: '#A78BFA', marginTop: 4 }}>{b.provider}</Text>
            <Text style={{ color: '#CCC', marginTop: 8 }}>Deadline: {b.deadline}</Text>
            {b.minAPS && <Text style={{ color: '#F59E0B' }}>Min APS: {b.minAPS}</Text>}
            {b.incomeCap && <Text style={{ color: '#F59E0B' }}>Income cap: R{b.incomeCap.toLocaleString()}</Text>}
            <Text style={{ color: '#7C3AED', marginTop: 8, fontWeight: 'bold' }}>Tap for details →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bursary Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' }}>
            <ScrollView>
              {selected && (
                <>
                  <Text style={{ color: '#10B981', fontSize: 22, fontWeight: 'bold' }}>{selected.name}</Text>
                  <Text style={{ color: '#A78BFA', marginTop: 4 }}>{selected.provider}</Text>
                  
                  <Text style={{ color: '#E0D6FF', fontWeight: 'bold', marginTop: 16 }}>Requirements:</Text>
                  {selected.requirements.map((r, i) => (
                    <Text key={i} style={{ color: '#CCC', marginTop: 4 }}>• {r}</Text>
                  ))}

                  <Text style={{ color: '#E0D6FF', fontWeight: 'bold', marginTop: 16 }}>Benefits:</Text>
                  {selected.benefits.map((b, i) => (
                    <Text key={i} style={{ color: '#CCC', marginTop: 4 }}>• {b}</Text>
                  ))}

                  <Text style={{ color: '#F59E0B', marginTop: 16 }}>Deadline: {selected.deadline}</Text>
                  {selected.contact && <Text style={{ color: '#CCC', marginTop: 4 }}>Note: {selected.contact}</Text>}

                  <TouchableOpacity onPress={() => Linking.openURL(selected.link)}
                    style={{ backgroundColor: '#10B981', padding: 16, borderRadius: 8, marginTop: 24 }}>
                    <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>Apply on Official Site →</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setSelected(null)}
                    style={{ padding: 16, marginTop: 8 }}>
                    <Text style={{ color: '#7C3AED', textAlign: 'center' }}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Chat Button */}
      <TouchableOpacity 
        onPress={() => setChatOpen(true)}
        style={{ 
          position: 'absolute', bottom: 20, right: 20, 
          backgroundColor: '#7C3AED', width: 60, height: 60, borderRadius: 30,
          justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#7C3AED', shadowOpacity: 0.5
        }}>
        <Text style={{ fontSize: 24 }}>🤖</Text>
      </TouchableOpacity>

      {/* AI Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              <Text style={{ color: '#E0D6FF', fontSize: 18, fontWeight: 'bold' }}>Campus Compass AI</Text>
              <TouchableOpacity onPress={() => setChatOpen(false)}>
                <Text style={{ color: '#7C3AED', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1, padding: 16 }}>
              {chatMessages.map((msg, i) => (
                <View key={i} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#7C3AED' : '#2A2A2A',
                  padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%'
                }}>
                  <Text style={{ color: '#FFF' }}>{msg.text}</Text>
                </View>
              ))}
              {aiLoading && <ActivityIndicator color="#7C3AED" style={{ marginTop: 8 }} />}
            </ScrollView>

            <View style={{ flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
              <TextInput
                placeholder="Ask about bursaries..."
                placeholderTextColor="#666"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChatMessage}
                style={{ flex: 1, backgroundColor: '#0A0A0A', color: '#FFF', padding: 12, borderRadius: 20, marginRight: 8 }}
              />
              <TouchableOpacity onPress={sendChatMessage} 
                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}