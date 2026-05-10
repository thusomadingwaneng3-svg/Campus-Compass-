import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Fuse from 'fuse.js';

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

type Bursary = any;
type Institution = any;
type School = any;

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedBursaries, setSavedBursaries] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [allSearchable, setAllSearchable] = useState<any[]>([]);
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);
  const [knowledge, setKnowledge] = useState<any>({});
  const [funding, setFunding] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
    loadSaved();
    requestPermissions();
  }, []);

  const loadData = async () => {
    try {
      // Load knowledge.json
      const knowledgeRes = await fetch('/public/data/knowledge.json');
      if (knowledgeRes.ok) {
        const knowledgeData = await knowledgeRes.json();
        setKnowledge(knowledgeData);
      }

      // Load funding.json
      const fundingRes = await fetch('/public/data/funding.json');
      if (fundingRes.ok) {
        const fundingData = await fundingRes.json();
        setFunding(fundingData);
        await AsyncStorage.setItem('fundingCache', JSON.stringify(fundingData));
      }
    } catch (e) {
      console.log('Failed to load data:', e);
    }
  };

  const loadSaved = async () => {
    const saved = await AsyncStorage.getItem('savedBursaries');
    if (saved) setSavedBursaries(JSON.parse(saved));

    const offlineFunding = await AsyncStorage.getItem('offlineFunding');
    if (offlineFunding) await AsyncStorage.setItem('fundingCache', offlineFunding);
  };

  const requestPermissions = async () => {
    if (Platform.OS!== 'web' && Notifications) {
      await Notifications.requestPermissionsAsync();
    }
  };

  const loadAllDataForSearch = async () => {
    if (!knowledge.institutions || funding.length === 0) return;

    let searchable: any[] = [];

    // 1. Load institutions
    const institutions = [
    ...(knowledge.institutions || []),
    ...(knowledge.tvet_colleges || []),
    ...(knowledge.private_institutions || [])
    ].map(i => ({...i, _type: 'institution' }));
    searchable = [...searchable,...institutions];

    // 2. Load schools from offline storage
    try {
      const indexStr = await AsyncStorage.getItem('offlineSchoolIndex');
      if (indexStr) {
        const index = JSON.parse(indexStr);
        for (const prov of Object.keys(index)) {
          const file = index[prov].file;
          const key = `offline_${file.split('/').pop().replace('.json', '')}`;
          const schoolsStr = await AsyncStorage.getItem(key);
          if (schoolsStr) {
            const schools = JSON.parse(schoolsStr);
            const mapped = schools.map((s: any) => ({...s, _type: 'school' }));
            searchable = [...searchable,...mapped];
          }
        }
      }
    } catch (e) {
      console.log('Could not load schools for AI:', e);
    }

    // 3. Load funding
    const bursaries = funding.map(b => ({...b, _type: 'bursary' }));
    searchable = [...searchable,...bursaries];

    setAllSearchable(searchable);

    // Build Fuse index
    const fuseInstance = new Fuse(searchable, {
      keys: ['name', 'short', 'shortName', 'provider', 'fields', 'id', 'city', 'province', 'district'],
      threshold: 0.35,
      includeScore: true,
    });
    setFuse(fuseInstance);

    console.log(`AI loaded ${searchable.length} items for search`);
  };

  useEffect(() => {
    loadAllDataForSearch();
  }, [knowledge, funding]);

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

    if (!fuse || allSearchable.length === 0) {
      return { content: 'Loading data... Tap "Download for Offline" in the drawer first, then try again.' };
    }

    const results = fuse.search(q, { limit: 3 });

    if (results.length > 0 && results[0].score! < 0.35) {
      const item = results[0].item;

      if (item._type === 'institution') {
        if (q.includes('security') || q.includes('emergency') || q.includes('contact') || q.includes('phone')) {
          return { content: `${item.short || item.name} Campus Security\n📞 ${item.security_phone || item.contact}\n📍 ${item.location}, ${item.province}\n\nNeed directions? Check the Map tab.` };
        }
        if (q.includes('where') || q.includes('location') || q.includes('address') || q.includes('directions')) {
          return { content: `${item.short || item.name}\n\n📍 ${item.location}, ${item.province}\n\nTap "Map" tab for directions.\n🌐 ${item.website}` };
        }
        if (q.includes('apply') || q.includes('application') || q.includes('admission') || q.includes('closing')) {
          return { content: `${item.short || item.name} Applications\n📅 Open: ${item.applications_open}\n📅 Close: ${item.applications_close}\n🌐 Apply: ${item.website}\n📞 ${item.contact}\n\n📧 ${item.email}` };
        }
        if (q.includes('aps') || q.includes('points') || q.includes('requirements') || q.includes('qualify')) {
          const faculties = Object.entries(item.faculties || {}).map(([name, data]: [string, any]) =>
            `• ${name}: APS ${data.aps}`
          ).join('\n');
          return { content: `${item.short || item.name} APS Requirements\n${faculties}\n\nFull prospectus: ${item.prospectus_link || item.website}` };
        }
        return { content: `${item.short || item.name}\n${item.type}\n\n📍 ${item.location}, ${item.province}\n📞 ${item.contact}\n📧 ${item.email}\n🌐 ${item.website}\n\n📅 Applications close: ${item.applications_close}` };
      }

      if (item._type === 'school') {
        return { content: `${item.name}\n${item.type}\n\n📍 ${item.city}, ${item.province} - ${item.district}\n📞 ${item.contact || 'Contact school'}\n📧 ${item.email || 'N/A'}\n\nAddress: ${item.address || 'N/A'}` };
      }

      if (item._type === 'bursary') {
        return {
          content: `${item.name}\nProvider: ${item.provider}\n\n• Deadline: ${item.deadline}\n• Fields: ${item.fields?.join(', ')}\n• Covers: ${item.covers?.join(', ')}\n• Requirements: ${item.requirements}\n\nApply: ${item.apply_link}\n\n${item.notes}`,
          bursaryId: item.id
        };
      }
    }

    const nsfas = funding.find(b => b.id === 'nsfas-2026');
    if (q.includes('nsfas') && nsfas) {
      if (q.includes('deadline') || q.includes('close') || q.includes('when')) {
        return { content: `NSFAS 2026 Applications:\n\n• Deadline: ${nsfas.deadline}\n• Status: Open\nApply: ${nsfas.apply_link}\n\n${nsfas.notes}`, bursaryId: nsfas.id };
      }
      return { content: `${nsfas.name}\n${nsfas.provider}\n\n• Deadline: ${nsfas.deadline}\n• Covers: ${nsfas.covers?.join(', ')}\n\nApply: ${nsfas.apply_link}`, bursaryId: nsfas.id };
    }

    if (q.includes('bursary') || q.includes('scholarship') || q.includes('funding') || q.includes('open') || q.includes('my bursaries') || q.includes('saved')) {
      let bursariesToSearch = funding;
      if (filter) {
        bursariesToSearch = funding.filter(b =>
          b.fields?.some(f => f.toLowerCase().includes(filter.toLowerCase()))
        );
      }

      let open = bursariesToSearch.filter(b => {
        if (q.includes('my') || q.includes('saved')) return savedBursaries.includes(b.id);
        if (b.status && b.status.toLowerCase().includes('open')) return true;
        if (!b.deadline) return false;
        const dateStr = b.deadline.split(' for ')[0].split(' at ')[0].split('Expected ')[1] || b.deadline.split(' for ')[0].split(' at ')[0];
        const deadlineDate = new Date(dateStr);
        return!isNaN(deadlineDate.getTime()) && deadlineDate > new Date();
      });

      if (open.length === 0) {
        return { content: 'No bursaries match your filter. Most applications open April-September 2026.\n\nData verified May 9, 2026.' };
      }

      return { content: `${q.includes('my') || q.includes('saved')? 'Your Saved' : 'Open'} Bursaries (${open.length}):\n\nData verified May 9, 2026\n` + open.slice(0, 6).map(b =>
        `• ${b.name}\n Provider: ${b.provider}\n Deadline: ${b.deadline}`
      ).join('\n\n') };
    }

    if (q.includes('help') || q.includes('what can you do')) {
      return { content: `I can help with:\n\n🎓 **Bursaries**: NSFAS, Sasol, Funza Lushaka, 50+ others\n• Deadlines, amounts, requirements\n🏫 **90+ Tertiary Institutions**: Universities, TVETs, private colleges\n• Contact, APS, locations, applications\n🏫 **24,000+ Schools**: All public schools in SA\n• Names, locations, contacts\n📊 **APS Calculator**: Tap the button below\nData verified May 9, 2026` };
    }

    return { content: `I don't have info on that. Try:\n\n**Bursaries**: "Sasol bursary", "NSFAS deadline"\n**Campuses**: "UP", "Wits security"\n**Schools**: "High school Pretoria", "Primary school Soweto"\n\nMake sure you hit "Download for Offline" first.` };
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

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
        <TouchableOpacity onPress={() => router.push('/aps')} style={styles.filterChip}>
          <Ionicons name="calculator" size={14} color="#8B0000" />
          <Text style={styles.filterText}> APS</Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios'? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollViewRef} style={styles.messages} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles" size={48} color="#8B0000" />
              <Text style={styles.emptyTitle}>Ask Thuso anything</Text>
              <Text style={styles.empty}>NSFAS, bursaries, campuses, schools</Text>

              <TouchableOpacity
                onPress={() => router.push('/aps')}
                style={styles.apsQuickBtn}
              >
                <Ionicons name="calculator" size={20} color="white" />
                <Text style={styles.apsQuickBtnText}>Calculate My APS Score</Text>
              </TouchableOpacity>
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
            placeholder="Ask about NSFAS, bursaries, campuses, schools..."
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
  emptyBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, color: '#333' },
  empty: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 15, marginBottom: 20 },
  apsQuickBtn: { flexDirection: 'row', backgroundColor: '#8B0000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 8 },
  apsQuickBtnText: { color: 'white', fontWeight: 'bold', size: 15 },
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