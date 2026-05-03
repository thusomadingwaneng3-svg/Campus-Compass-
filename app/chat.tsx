import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Fuse from 'fuse.js';
import knowledge from '../public/data/knowledge.json';
import funding from '../public/data/funding.json';

// Only import notifications on mobile
let Notifications: any = null;
if (Platform.OS!== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  bursaryId?: string;
};

type Bursary = typeof funding[0];

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedBursaries, setSavedBursaries] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    loadSaved();
    requestPermissions();
  }, []);

  const loadSaved = async () => {
    const saved = await AsyncStorage.getItem('savedBursaries');
    if (saved) setSavedBursaries(JSON.parse(saved));
    await AsyncStorage.setItem('fundingCache', JSON.stringify(funding));
  };

  const requestPermissions = async () => {
    if (Platform.OS!== 'web' && Notifications) {
      await Notifications.requestPermissionsAsync();
    }
  };

  // PRO LIMIT CHECK - ADDED
  const checkProLimit = async (): Promise<boolean> => {
    const isProUser = await AsyncStorage.getItem('isPro');
    if (isProUser === 'true') return true;
    
    const today = new Date().toDateString();
    const usage = JSON.parse(await AsyncStorage.getItem('dailyUsage') || '{"date":"","count":0}');
    
    if (usage.date!== today) {
      await AsyncStorage.setItem('dailyUsage', JSON.stringify({ date: today, count: 1 }));
      return true;
    }
    
    if (usage.count >= 10) {
      Alert.alert(
        'Daily Limit Reached', 
        'Free users get 10 AI searches per day. Upgrade to Pro for R5/month for unlimited access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => router.push('/pro') }
        ]
      );
      return false;
    }
    
    await AsyncStorage.setItem('dailyUsage', JSON.stringify({...usage, count: usage.count + 1 }));
    return true;
  };

  const fuse = new Fuse(funding as Bursary[], {
    keys: ['name', 'provider', 'fields', 'id'],
    threshold: 0.4,
    includeScore: true,
  });

  const toggleSave = async (bursaryId: string) => {
    const updated = savedBursaries.includes(bursaryId)
     ? savedBursaries.filter(id => id!== bursaryId)
      : [...savedBursaries, bursaryId];
    setSavedBursaries(updated);
    await AsyncStorage.setItem('savedBursaries', JSON.stringify(updated));
  };

  const shareBursary = async (bursary: Bursary) => {
    const text = `🎓 ${bursary.name}\n\n📅 Deadline: ${bursary.deadline}\n💰 Covers: ${bursary.covers?.join(', ')}\n\nApply: ${bursary.apply_link}\n\nShared via Thuso AI`;
    await Share.share({ message: text });
  };

  const setReminder = async (bursary: Bursary) => {
    if (Platform.OS === 'web' ||!Notifications) {
      Alert.alert('Mobile Only', 'Reminders work after you install the app on your phone. Tap "Install App" in the drawer first.');
      return;
    }
    
    try {
      const dateStr = bursary.deadline.split(' for ')[0].split(' at ')[0].split('Expected ')[1] || bursary.deadline.split(' for ')[0].split(' at ')[0];
      const deadline = new Date(dateStr);
      const reminderDate = new Date(deadline.getTime() - 7 * 24 * 60 * 1000);

      if (reminderDate < new Date()) {
        Alert.alert('Deadline passed', 'This bursary deadline has already passed.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${bursary.name} closes soon!`,
          body: `Deadline: ${bursary.deadline}. Apply: ${bursary.apply_link}`,
        },
        trigger: reminderDate,
      });

      Alert.alert('Reminder set', `We'll notify you 7 days before ${bursary.name} closes.`);
    } catch (e) {
      Alert.alert('Error', 'Could not set reminder. Check the deadline format.');
    }
  };

  const getThusoReply = (userMsg: string): { content: string; bursaryId?: string } => {
    const q = userMsg.toLowerCase().trim();
    const allBursaries = funding as Bursary[];

    let bursariesToSearch = allBursaries;
    if (filter) {
      bursariesToSearch = allBursaries.filter(b =>
        b.fields?.some(f => f.toLowerCase().includes(filter.toLowerCase()))
      );
    }

    const nsfas = bursariesToSearch.find(b => b.id === 'nsfas2027');
    const allInstitutions = [
     ...(knowledge.institutions || []),
     ...(knowledge.tvet_colleges || []),
     ...(knowledge.private_institutions || [])
    ];

    if (q.includes('nsfas') && nsfas) {
      if (q.includes('deadline') || q.includes('close') || q.includes('when')) {
        return { content: `NSFAS 2027 Applications:\n\n• Deadline: ${nsfas.deadline}\n• Status: ${nsfas.status}\n\nApply: ${nsfas.apply_link}\n\n${nsfas.notes}`, bursaryId: nsfas.id };
      }
      if (q.includes('cover') || q.includes('amount') || q.includes('pay') || q.includes('allowance')) {
        return { content: `NSFAS covers:\n${nsfas.covers?.map(item => `• ${item}`).join('\n')}\n\nIncome threshold: ${nsfas.income_threshold}`, bursaryId: nsfas.id };
      }
      return { content: `${nsfas.name}\n${nsfas.provider}\n\n• Deadline: ${nsfas.deadline}\n• Status: ${nsfas.status}\n• Covers: ${nsfas.covers?.join(', ')}\n\nApply: ${nsfas.apply_link}`, bursaryId: nsfas.id };
    }

    const fuzzyResults = fuse.search(q, { limit: 1 });
    if (fuzzyResults.length > 0 && fuzzyResults[0].score! < 0.4) {
      const b = fuzzyResults[0].item;
      return {
        content: `${b.name}\nProvider: ${b.provider}\n\n• Deadline: ${b.deadline}\n• Status: ${b.status}\n• Fields: ${b.fields?.join(', ')}\n• Covers: ${b.covers?.join(', ')}\n• Requirements: ${b.requirements}\n\nApply: ${b.apply_link}\n\n${b.notes}`,
        bursaryId: b.id
      };
    }

    if (q.includes('bursary') || q.includes('scholarship') || q.includes('open') || q.includes('my bursaries') || q.includes('saved')) {
      let open = bursariesToSearch.filter(b => {
        if (q.includes('my') || q.includes('saved')) return savedBursaries.includes(b.id);
        if (b.status && b.status.toLowerCase().includes('open')) return true;
        if (!b.deadline) return false;
        const dateStr = b.deadline.split(' for ')[0].split(' at ')[0].split('Expected ')[1] || b.deadline.split(' for ')[0].split(' at ')[0];
        const deadlineDate = new Date(dateStr);
        return!isNaN(deadlineDate.getTime()) && deadlineDate > new Date();
      });

      if (open.length === 0) {
        return { content: 'No bursaries match your filter. Most applications open April-September 2026.\n\nData verified May 2, 2026.' };
      }

      return { content: `${q.includes('my') || q.includes('saved')? 'Your Saved' : 'Open'} Bursaries (${open.length}):\n\nData verified May 2, 2026\n\n` + open.slice(0, 6).map(b =>
        `• ${b.name}\n Provider: ${b.provider}\n Deadline: ${b.deadline}`
      ).join('\n\n') };
    }

    const instFuse = new Fuse(allInstitutions, { keys: ['name', 'short'], threshold: 0.4 });
    const instResult = instFuse.search(q, { limit: 1 });
    if (instResult.length > 0 && instResult[0].score! < 0.4) {
      const found = instResult[0].item;
      if (q.includes('security') || q.includes('emergency')) {
        return { content: `${found.short || found.name} Campus Security\n\n📞 ${found.security_phone || found.contact}\n📍 ${found.location}, ${found.province}` };
      }
      return { content: `${found.short || found.name}\n${found.type}\n\n📍 ${found.location}, ${found.province}\n📞 ${found.contact}\n📧 ${found.email}\n🌐 ${found.website}\n\nApplications close: ${found.applications_close}` };
    }

    if (q.includes('help')) {
      return { content: `I can help with:\n\n• NSFAS: deadlines, amounts, requirements\n• 50+ Bursaries: Sasol, Funza Lushaka, Transnet, Chevening, etc\n• All 90 SA institutions\n\nFilters: Engineering | Teaching | IT | Accounting\nData verified May 2, 2026\n\nTry: "engineering bursaries" or "my bursaries"` };
    }

    return { content: `I don't have info on that. Try:\n\n• "Sasol bursary"\n• "engineering bursaries"\n• "my bursaries"\n• "NSFAS deadline"\n\nData verified May 2, 2026` };
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    // CHECK PRO LIMIT FIRST - ADDED
    const canSend = await checkProLimit();
    if (!canSend) return;
    
    const userMsg = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    setTimeout(() => {
      const reply = getThusoReply(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: reply.content, bursaryId: reply.bursaryId }]);
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, 300);
  };

  const filters = ['Engineering', 'Teaching', 'IT', 'Accounting', 'Science'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="school" size={24} color="#8B0000" />
        <Text style={styles.headerTitle}>Thuso AI</Text>
        <Text style={styles.headerSubtitle}>Campus Compass Assistant</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        <TouchableOpacity onPress={() => setFilter(null)} style={[styles.filterChip,!filter && styles.filterActive]}>
          <Text style={[styles.filterText,!filter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {filters.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setMessage('my bursaries')} style={styles.filterChip}>
          <Ionicons name="heart" size={14} color="#8B0000" />
          <Text style={styles.filterText}> Saved</Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios'? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollViewRef} style={styles.messages} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles" size={48} color="#8B0000" />
              <Text style={styles.emptyTitle}>Ask Thuso anything</Text>
              <Text style={styles.empty}>NSFAS, bursaries, or any SA campus info</Text>
            </View>
          )}
          {messages.map((m, i) => {
            const bursary = m.bursaryId? (funding as Bursary[]).find(b => b.id === m.bursaryId) : null;
            return (
              <View key={i} style={[styles.bubble, m.role === 'user'? styles.userBubble : styles.aiBubble]}>
                <Text style={m.role === 'user'? styles.userText : styles.aiText}>{m.content}</Text>
                {bursary && m.role === 'assistant' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => toggleSave(bursary.id)} style={styles.actionBtn}>
                      <Ionicons name={savedBursaries.includes(bursary.id)? "heart" : "heart-outline"} size={18} color="#8B0000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setReminder(bursary)} style={styles.actionBtn}>
                      <Ionicons name="alarm-outline" size={18} color="#8B0000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shareBursary(bursary)} style={styles.actionBtn}>
                      <Ionicons name="share-social-outline" size={18} color="#8B0000" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          {loading && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.aiText}>Thuso is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about NSFAS, bursaries, campuses..."
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, (!message.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={loading ||!message.trim()}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#e5e5e5', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B0000', marginTop: 4 },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  filterBar: { maxHeight: 50, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e5e5e5' },
  filterChip: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, alignItems: 'center' },
  filterActive: { backgroundColor: '#8B0000' },
  filterText: { color: '#333', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  messages: { flex: 1, padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, color: '#333' },
  empty: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 15 },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#8B0000', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userText: { color: 'white', fontSize: 15, lineHeight: 20 },
  aiText: { color: '#000', fontSize: 15, lineHeight: 22 },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 16 },
  actionBtn: { padding: 4 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#e5e5e5', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100, fontSize: 15, backgroundColor: '#fafafa' },
  sendBtn: { backgroundColor: '#8B0000', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' }
});