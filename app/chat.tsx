import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Share, Alert, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Fuse from 'fuse.js';

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

type Props = {
  mode?: 'chat' | 'copilot';
  userContext?: any;
};

export default function ChatScreen({ mode = 'chat', userContext = {} }: Props) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedBursaries, setSavedBursaries] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [allSearchable, setAllSearchable] = useState<any[]>([]);
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);
  const [knowledge, setKnowledge] = useState<any>({});
  const [funding, setFunding] = useState<any[]>([]);
  const [accommodation, setAccommodation] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  // Animations
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const useNativeDriver = Platform.OS!== 'web';

  const quickPrompts = mode === 'copilot'
   ? ['Apply for NSFAS', 'Check my APS', 'Find bursaries for me', 'Saved bursaries']
    : ['NSFAS deadline', 'Sasol bursary', 'UP APS requirements', 'Saved bursaries'];

  useEffect(() => {
    loadData();
    loadSaved();
    loadChatHistory();
    requestPermissions();
    startBlobAnimation();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (loading) startTypingAnimation();
    else stopTypingAnimation();
  }, [loading]);

  const startBlobAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(blob1, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(blob2, { toValue: 0, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver })
      ])
    ).start();
  };

  const startTypingAnimation = () => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver })
        ])
      ).start();
    };
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  };

  const stopTypingAnimation = () => {
    dot1.stopAnimation();
    dot2.stopAnimation();
    dot3.stopAnimation();
    dot1.setValue(0);
    dot2.setValue(0);
    dot3.setValue(0);
  };

  const loadData = async () => {
    try {
      const [cachedKnowledge, cachedFunding, cachedAfrica] = await Promise.all([
        AsyncStorage.getItem('offlineKnowledge'),
        AsyncStorage.getItem('offlineFunding'),
        AsyncStorage.getItem('offlineAfricaNonSA')
      ]);

      if (cachedKnowledge) setKnowledge(JSON.parse(cachedKnowledge));
      if (cachedFunding) setFunding(JSON.parse(cachedFunding));

      const knowledgeRes = await fetch('/data/knowledge.json');
      if (knowledgeRes.ok) {
        const data = await knowledgeRes.json();
        setKnowledge(data);
        await AsyncStorage.setItem('offlineKnowledge', JSON.stringify(data));
      }

      const fundingRes = await fetch('/data/funding.json');
      if (fundingRes.ok) {
        const data = await fundingRes.json();
        setFunding(data);
        await AsyncStorage.setItem('fundingCache', JSON.stringify(data));
      }

      const accRes = await fetch('/data/accommodation.json');
      if (accRes.ok) setAccommodation(await accRes.json());

      if (!cachedAfrica) {
        const africaRes = await fetch('/data/africa_non_sa.json');
        if (africaRes.ok) {
          const data = await africaRes.json();
          await AsyncStorage.setItem('offlineAfricaNonSA', JSON.stringify(data));
        }
      }
    } catch (e) {
      console.log('Failed to load data:', e);
    }
  };

  const loadSaved = async () => {
    const saved = await AsyncStorage.getItem('savedBursaries');
    if (saved) setSavedBursaries(JSON.parse(saved));
  };

  const loadChatHistory = async () => {
    const history = await AsyncStorage.getItem('chatHistory');
    if (history) setMessages(JSON.parse(history));
  };

  const requestPermissions = async () => {
    if (Platform.OS!== 'web' && Notifications) {
      await Notifications.requestPermissionsAsync();
    }
  };

  const loadAllDataForSearch = async () => {
    if (!knowledge.institutions && funding.length === 0) return;

    let searchable: any[] = [];

    const institutions = [
     ...(knowledge.institutions || []),
     ...(knowledge.tvet_colleges || []),
     ...(knowledge.private_institutions || [])
    ].map(i => ({
     ...i,
      _type: 'institution',
      country: 'South Africa',
      city: i.location || i.city || '',
      phone: i.security_phone || i.contact || i.phone || '',
      website: i.website || i.apply_link || '',
      applications_close: i.applications_close || i.application_deadline_2026 || '',
    }));
    searchable = [...searchable,...institutions];

    try {
      const africaStr = await AsyncStorage.getItem('offlineAfricaNonSA');
      let africaData = [];
      if (africaStr) {
        africaData = JSON.parse(africaStr);
      } else {
        const res = await fetch('/data/africa_non_sa.json');
        if (res.ok) africaData = await res.json();
      }

      const normalizedAfrica = africaData.map((inst: any, i: number) => ({
       ...inst,
        id: inst.id || `africa-${i}`,
        _type: 'institution',
        country: inst.country || 'Africa',
        city: inst.city || '',
        province: inst.province || '',
        phone: inst.security_phone || inst.phone || '',
        website: inst.website || inst.apply_link || '',
        applications_close: inst.applications_close || 'TBA'
      }));
      searchable = [...searchable,...normalizedAfrica];
    } catch (e) {
      console.log('Could not load Africa data for AI:', e);
    }

    try {
      if (Platform.OS === 'web') {
        const indexRes = await fetch('/data/schools/index.json');
        if (indexRes.ok) {
          const index = await indexRes.json();
          const schoolPromises = Object.values(index).map((p: any) =>
            fetch(p.file).then(r => r.ok? r.json() : [])
          );
          const schoolArrays = await Promise.all(schoolPromises);
          const schools = schoolArrays.flat();
          searchable = [...searchable,...schools.map((s: any) => ({...s, _type: 'school' }))];
        }
      } else {
        const indexStr = await AsyncStorage.getItem('offlineSchoolIndex');
        if (indexStr) {
          const index = JSON.parse(indexStr);
          for (const prov of Object.keys(index)) {
            const file = index[prov].file;
            const key = `offline_${file.split('/').pop().replace('.json', '')}`;
            const schoolsStr = await AsyncStorage.getItem(key);
            if (schoolsStr) {
              const schools = JSON.parse(schoolsStr);
              searchable = [...searchable,...schools.map((s: any) => ({...s, _type: 'school' }))];
            }
          }
        }
      }
    } catch (e) {
      console.log('Could not load schools for AI:', e);
    }

    searchable = [...searchable,...funding.map(b => ({...b, _type: 'bursary' }))];

    searchable = [...searchable,...(accommodation.flatMap(acc =>
      (acc.residences || []).map((r: any) => ({
       ...r,
        institution: acc.institution,
        province: acc.province,
        instType: acc.type,
        _type: 'accommodation'
      }))
    ))];

    setAllSearchable(searchable);

    const fuseInstance = new Fuse(searchable, {
      keys: ['name', 'short', 'shortName', 'provider', 'fields', 'id', 'city', 'province', 'district', 'institution', 'roomType', 'gender', 'country'],
      threshold: 0.35,
      includeScore: true,
    });
    setFuse(fuseInstance);
  };

  useEffect(() => {
    loadAllDataForSearch();
  }, [knowledge, funding, accommodation]);

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

  const shareBursary = async (bursary: any) => {
    const text = `🎓 ${bursary.name}\n\n📅 Deadline: ${bursary.deadline}\n💰 Covers: ${bursary.covers?.join(', ')}\n\nApply: ${bursary.apply_link}\n\nShared via Thuso AI`;
    await Share.share({ message: text });
  };

  const setReminder = async (bursary: any) => {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) {
        Alert.alert('Not Supported', 'Use Chrome or Edge for reminders');
        return;
      }
      if (Notification.permission!== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm!== 'granted') return;
      }

      const dateStr = bursary.deadline.split(' for ')[0].split(' at ')[0];
      const deadline = new Date(dateStr);
      const reminderDate = new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (reminderDate < new Date()) {
        Alert.alert('Deadline passed', 'This bursary deadline has already passed.');
        return;
      }

      localStorage.setItem(`reminder_${bursary.id}`, JSON.stringify({
        title: `⏰ ${bursary.name} closes soon!`,
        body: `Deadline: ${bursary.deadline}`,
        time: reminderDate.getTime()
      }));

      Alert.alert('Reminder set', 'You’ll get a browser notification 7 days before');
      return;
    }

    if (!Notifications) {
      Alert.alert('Mobile Only', 'Reminders work after you install the app on your phone.');
      return;
    }

    try {
      const dateStr = bursary.deadline.split(' for ')[0].split(' at ')[0];
      const deadline = new Date(dateStr);
      const reminderDate = new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000);

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

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Delete all messages? This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await AsyncStorage.removeItem('chatHistory');
          }
        }
      ]
    );
  };

  const deleteMessage = async (index: number) => {
    const updated = messages.filter((_, i) => i!== index);
    setMessages(updated);
    await AsyncStorage.setItem('chatHistory', JSON.stringify(updated));
  };

  const confirmDeleteMessage = (index: number) => {
    Alert.alert(
      'Delete Message',
      'Delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(index) }
      ]
    );
  };

  const getThusoReply = (userMsg: string): { content: string; bursaryId?: string } => {
    const q = userMsg.toLowerCase().trim();

    if (!fuse || allSearchable.length === 0) {
      return { content: 'Loading data... Please wait a moment and try again.' };
    }

    if (mode === 'copilot') {
      if (q.includes('apply nsfas')) {
        const nsfas = funding.find(b => b.id === 'nsfas2027');
        if (!nsfas) return { content: 'NSFAS data not loaded yet.' };

        return {
          content: `Got you ${userContext.name || 'there'}! Here’s what I have:

👤 Name: ${userContext.name || '[Add in Profile]'}
🏫 Campus: ${userContext.campus || '[Add in Profile]'}
📚 Course: ${userContext.course || '[Add in Profile]'}
📊 APS: ${userContext.aps || '[Add in Profile]'}

Click to apply: ${nsfas.apply_link}
Deadline: ${nsfas.deadline}`,
          bursaryId: nsfas.id
        };
      }

      if (q.includes('check my aps')) {
        return {
          content: `Your APS is ${userContext.aps || 'not set yet'}.

Go to APS Calculator to check if you qualify for your course. Want me to take you there?`
        };
      }
    }

    const results = fuse.search(q, { limit: 5 });

    if (results.length > 0 && results[0].score! < 0.35) {
      const item = results[0].item;

      if (item._type === 'accommodation') {
        const isNSFAS = item.roomType?.includes('NSFAS');
        return {
          content: `${item.name}\n${item.institution} - ${item.province}\n\n🏠 ${item.gender} • ${item.roomType}\n💰 ${item.price || 'Contact for price'}\n${isNSFAS? '✅ NSFAS Accredited\n' : ''}📞 ${item.contact || 'N/A'}\n🌐 ${item.applyLink || 'N/A'}`
        };
      }

      if (item._type === 'institution') {
        const name = item.short || item.name;
        const city = item.city || '';
        const province = item.province || '';
        const country = item.country || 'South Africa';
        const phone = item.security_phone || item.phone || 'N/A';
        const medical = item.medical_phone || 'N/A';
        const email = item.email || 'N/A';
        const website = item.website || 'N/A';
        const appClose = item.applications_close || 'TBA';

        if (q.includes('security') || q.includes('emergency') || q.includes('contact')) {
          return { content: `${name} Campus Security\n📞 ${phone}\n📞 Medical: ${medical}\n📍 ${city}, ${province}${country!== 'South Africa'? `, ${country}` : ''}` };
        }
        if (q.includes('apply') || q.includes('application') || q.includes('closing')) {
          return { content: `${name} Applications\n📅 Close: ${appClose}\n🌐 Apply: ${website}\n📞 ${phone}\n📧 ${email}` };
        }
        if (q.includes('aps') || q.includes('requirements')) {
          const faculties = Object.entries(item.faculties || {}).map(([name, data]: [string, any]) =>
            `• ${name}: APS ${data.aps}`
          ).join('\n') || 'No faculty data loaded';
          return { content: `${name} APS Requirements\n${faculties}\n\nProspectus: ${item.prospectus_link || website}` };
        }
        return {
          content: `${name}\n${item.type || 'Institution'}${country!== 'South Africa'? ` - ${country}` : ''}
📍 ${city}, ${province}${country!== 'South Africa'? `, ${country}` : ''}
📞 ${phone}
📧 ${email}
🌐 ${website}
📅 Applications close: ${appClose}`
        };
      }

      if (item._type === 'bursary') {
        return {
          content: `${item.name}\nProvider: ${item.provider}\n\n• Deadline: ${item.deadline}\n• Fields: ${item.fields?.join(', ')}\n• Covers: ${item.covers?.join(', ')}\n• Requirements: ${item.requirements}\n\nApply: ${item.apply_link}\n\n${item.notes}`,
          bursaryId: item.id
        };
      }
    }

    const nsfas = funding.find(b => b.id === 'nsfas2027');
    if (q.includes('nsfas') && nsfas) {
      return {
        content: `${nsfas.name}\n${nsfas.provider}\n\n• Deadline: ${nsfas.deadline}\n• Status: ${nsfas.status}\n• Covers: ${nsfas.covers?.join(', ')}\n\nApply: ${nsfas.apply_link}`,
        bursaryId: nsfas.id
      };
    }

    if (q.includes('bursary') || q.includes('scholarship') || q.includes('funding') || q.includes('open') || q.includes('saved')) {
      let bursariesToSearch = funding;
      if (filter) {
        bursariesToSearch = funding.filter(b =>
          b.fields?.some((f: string) => f.toLowerCase().includes(filter.toLowerCase()))
        );
      }

      let open = bursariesToSearch.filter(b => {
        if (q.includes('saved')) return savedBursaries.includes(b.id);
        if (b.status && b.status.toLowerCase().includes('open')) return true;
        return false;
      });

      if (open.length === 0) {
        return { content: 'No bursaries match your filter. Most applications open April-September 2026.' };
      }

      return { content: `${q.includes('saved')? 'Your Saved' : 'Open'} Bursaries (${open.length}):\n\n` + open.slice(0, 6).map(b =>
        `• ${b.name}\n Provider: ${b.provider}\n Deadline: ${b.deadline}`
      ).join('\n\n') };
    }

    if (q.includes('help')) {
      return { content: `I can help with:\n\n🎓 **Bursaries**: NSFAS, Sasol, Funza Lushaka, 50+ others\n🏫 **470+ Institutions**: SA + Africa TVETs & colleges\n🏠 **420+ Residences**: On-campus & NSFAS accredited housing\n🏫 **24,000+ Schools**: All public schools in SA\n📊 **APS Calculator**: Tap the button below` };
    }

    return { content: `I don't have info on that. Try:\n\n**Africa TVETs**: "Kenya TVET"\n**Residences**: "UCT female residence"\n**Bursaries**: "Sasol bursary"\n**Campuses**: "UP security"\n**Schools**: "High school Pretoria"` };
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

  const blob1Transform = {
    transform: [
      { translateX: blob1.interpolate({ inputRange: [0, 1], outputRange: [-50, 50] }) },
      { translateY: blob1.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) },
      { scale: blob1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }
    ],
    opacity: 0.15
  };

  const blob2Transform = {
    transform: [
      { translateX: blob2.interpolate({ inputRange: [0, 1], outputRange: [50, -50] }) },
      { translateY: blob2.interpolate({ inputRange: [0, 1], outputRange: [30, -30] }) },
      { scale: blob2.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1] }) }
    ],
    opacity: 0.12
  };

  const primaryColor = '#E63946';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient colors={['#FFF5F5', '#FFE8E8', '#FFF']} style={{ flex: 1 }}>
        <Animated.View style={[styles.blob, styles.blob1, blob1Transform]} />
        <Animated.View style={[styles.blob, styles.blob2, blob2Transform]} />

        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={mode === 'copilot'? "sparkles" : "school"} size={24} color={primaryColor} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.headerTitle}>
                {mode === 'copilot'? 'Campus Copilot' : 'Thuso AI'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {mode === 'copilot'? 'AI + Your Data' : 'Campus Compass Assistant'}
              </Text>
            </View>
          </View>

          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color={primaryColor} />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
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
          <TouchableOpacity onPress={() => setMessage('saved bursaries')} style={styles.filterChip}>
            <Ionicons name="heart" size={14} color={primaryColor} />
            <Text style={styles.filterText}> Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/aps')} style={styles.filterChip}>
            <Ionicons name="calculator" size={14} color={primaryColor} />
            <Text style={styles.filterText}> APS</Text>
          </TouchableOpacity>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBar}>
          {quickPrompts.map(p => (
            <TouchableOpacity key={p} onPress={() => setMessage(p)} style={styles.quickPrompt}>
              <Text style={styles.quickPromptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios'? 'padding' : 'height'} keyboardVerticalOffset={90}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messages}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name={mode === 'copilot'? "sparkles" : "chatbubbles"} size={48} color={primaryColor} />
                <Text style={styles.emptyTitle}>
                  {mode === 'copilot'? 'Ask Copilot anything' : 'Ask Thuso anything'}
                </Text>
                <Text style={styles.empty}>
                  {mode === 'copilot'
                   ? 'I can pre-fill forms, set reminders, check APS'
                    : 'NSFAS, bursaries, residences, campuses, schools'}
                </Text>

                <TouchableOpacity onPress={() => router.push('/aps')} style={styles.apsQuickBtn}>
                  <Ionicons name="calculator" size={20} color="white" />
                  <Text style={styles.apsQuickBtnText}>Calculate My APS Score</Text>
                </TouchableOpacity>
              </View>
            )}
            {messages.map((m, i) => {
              const bursary = m.bursaryId? funding.find(b => b.id === m.bursaryId) : null;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onLongPress={() => confirmDeleteMessage(i)}
                  delayLongPress={400}
                >
                  <View style={[styles.bubble, m.role === 'user'? styles.userBubble : styles.aiBubble]}>
                    <Text style={m.role === 'user'? styles.userText : styles.aiText}>{m.content}</Text>
                    {bursary && m.role === 'assistant' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => toggleSave(bursary.id)} style={styles.actionBtn}>
                          <Ionicons name={savedBursaries.includes(bursary.id)? "heart" : "heart-outline"} size={18} color={primaryColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setReminder(bursary)} style={styles.actionBtn}>
                          <Ionicons name="alarm-outline" size={18} color={primaryColor} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => shareBursary(bursary)} style={styles.actionBtn}>
                          <Ionicons name="share-social-outline" size={18} color={primaryColor} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            {loading && (
              <View style={[styles.bubble, styles.aiBubble]}>
                <View style={styles.typingContainer}>
                  <Animated.View style={[styles.dot, { opacity: dot1 }]} />
                  <Animated.View style={[styles.dot, { opacity: dot2 }]} />
                  <Animated.View style={[styles.dot, { opacity: dot3 }]} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={mode === 'copilot'? "Ask Copilot to help you apply..." : "Ask about NSFAS, bursaries, residences..."}
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={sendMessage}
              multiline
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!message.trim() || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={loading ||!message.trim()}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E63946'
  },
  blob1: { top: '10%', left: '-20%' },
  blob2: { bottom: '15%', right: '-25%' },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 1
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1D1D1D', marginTop: 4 },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(230, 57, 70, 0.1)'
  },
  clearBtnText: { marginLeft: 4, fontSize: 14, color: '#E63946', fontWeight: '600' },

  filterBar: {
    maxHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.15)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 1
  },
  quickBar: { maxHeight: 40, paddingHorizontal: 12, paddingVertical: 8, zIndex: 1 },
  filterChip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.15)'
  },
  filterActive: { backgroundColor: '#E63946' },
  filterText: { color: '#333', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  quickPrompt: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.15)'
  },
  quickPromptText: { fontSize: 12, color: '#E63946', fontWeight: '500' },

  messages: { flex: 1, padding: 16, zIndex: 1 },
  emptyBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, color: '#1D1D1D' },
  empty: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 15, marginBottom: 20 },
  apsQuickBtn: {
    flexDirection: 'row',
    backgroundColor: '#E63946',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#E63946',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  apsQuickBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  bubble: { padding: 12, borderRadius: 18, marginBottom: 12, maxWidth: '85%' },
  userBubble: {
    backgroundColor: '#E63946',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  userText: { color: 'white', fontSize: 15, lineHeight: 20 },
  aiText: { color: '#1D1D1D', fontSize: 15, lineHeight: 22 },

  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E63946'
  },

  actionRow: { flexDirection: 'row', marginTop: 8, gap: 16 },
  actionBtn: { padding: 4 },

  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.15)',
    alignItems: 'flex-end',
    zIndex: 1
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#fafafa'
  },
  sendBtn: {
    backgroundColor: '#E63946',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E63946',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0
  }
});