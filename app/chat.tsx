import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import knowledge from '../public/data/knowledge.json';
import funding from '../public/data/funding.json';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const getThusoReply = (userMsg: string): string => {
    const q = userMsg.toLowerCase().trim();
    
    // Combine all institutions
    const allInstitutions = [
      ...(knowledge.institutions || []),
      ...(knowledge.tvet_colleges || []),
      ...(knowledge.private_institutions || [])
    ];

    // 1. NSFAS QUERIES
    if (q.includes('nsfas')) {
      const nsfas = funding.nsfas;
      if (q.includes('deadline') || q.includes('close') || q.includes('when') || q.includes('date')) {
        return `NSFAS 2026 Applications:\n\n• Opens: ${nsfas.applications_open}\n• Closes: ${nsfas.applications_close}\n\nApply online: ${nsfas.website}`;
      }
      if (q.includes('cover') || q.includes('amount') || q.includes('pay') || q.includes('allowance') || q.includes('money')) {
        return `NSFAS covers:\n${nsfas.covers.map(item => `• ${item}`).join('\n')}\n\nMaximum allowance: ${nsfas.max_allowance}`;
      }
      if (q.includes('requirement') || q.includes('qualify') || q.includes('who')) {
        return `NSFAS Requirements:\n${nsfas.requirements.map(item => `• ${item}`).join('\n')}\n\nApply: ${nsfas.website}`;
      }
      return `${nsfas.description}\n\nKey dates:\n• Opens: ${nsfas.applications_open}\n• Closes: ${nsfas.applications_close}\n\nApply: ${nsfas.website}`;
    }

    // 2. BURSARY QUERIES
    if (q.includes('bursary') || q.includes('bursaries') || q.includes('scholarship') || q.includes('funding')) {
      const bursaries = funding.bursaries || [];
      const now = new Date();
      const open = bursaries.filter(b => new Date(b.deadline) > now);
      
      // Check for specific bursary name
      const specificBursary = bursaries.find(b => q.includes(b.name.toLowerCase()));
      if (specificBursary) {
        return `${specificBursary.name}\n\n• Deadline: ${specificBursary.deadline}\n• Fields: ${specificBursary.fields?.join(', ') || 'All fields'}\n• Covers: ${specificBursary.covers?.join(', ') || 'Varies'}\n\nApply: ${specificBursary.website}`;
      }

      if (open.length === 0) {
        return 'No bursaries are currently open. Most applications open April-September. Check back later or ask about NSFAS.';
      }
      
      return `Open Bursaries (${open.length}):\n\n` + open.slice(0, 5).map(b => 
        `• ${b.name}\n  Deadline: ${b.deadline}\n  ${b.fields?.slice(0,2).join(', ')}`
      ).join('\n\n') + (open.length > 5 ? `\n\n+${open.length - 5} more. Ask for a specific bursary name.` : '');
    }

    // 3. INSTITUTION QUERIES - Find best match
    const found = allInstitutions.find(i => {
      const nameMatch = q.includes(i.name.toLowerCase());
      const shortMatch = i.short && q.includes(i.short.toLowerCase());
      const locationMatch = i.location && q.includes(i.location.toLowerCase());
      return nameMatch || shortMatch || locationMatch;
    });

    if (found) {
      // Security/Emergency
      if (q.includes('security') || q.includes('emergency') || q.includes('safety') || q.includes('phone') || q.includes('call')) {
        return `${found.short || found.name} Campus Security\n\n📞 ${found.security_phone || found.contact}\n📍 ${found.location}, ${found.province}`;
      }
      
      // Applications
      if (q.includes('application') || q.includes('apply') || q.includes('deadline') || q.includes('close') || q.includes('admission')) {
        return `${found.short || found.name} Applications\n\n• Opens: ${found.applications_open}\n• Closes: ${found.applications_close}\n• Type: ${found.type}\n\nProspectus: ${found.prospectus_link}\nWebsite: ${found.website}`;
      }
      
      // Residence/Accommodation
      if (q.includes('residence') || q.includes('accommodation') || q.includes('housing') || q.includes('cost') || q.includes('fee')) {
        return `${found.short || found.name} Residence\n\n💰 ${found.residence_cost}\n\n📞 Contact: ${found.contact}\n📧 ${found.email}`;
      }

      // Faculties/Courses
      if (q.includes('faculty') || q.includes('course') || q.includes('degree') || q.includes('study') || q.includes('aps')) {
        const faculties = Object.entries(found.faculties || {});
        if (faculties.length === 0) return `${found.short || found.name} - No faculty data available. Check: ${found.website}`;
        return `${found.short || found.name} Faculties:\n\n` + faculties.slice(0, 4).map(([name, data]: [string, any]) => 
          `• ${name}\n  APS: ${data.aps} | Degrees: ${data.degrees?.join(', ')}`
        ).join('\n\n');
      }

      // Default: Full info
      return `${found.short || found.name}\n${found.type}\n\n📍 ${found.location}, ${found.province}\n📞 ${found.contact}\n📧 ${found.email}\n🌐 ${found.website}\n\nApplications close: ${found.applications_close}`;
    }

    // 4. HELP
    if (q.includes('help') || q.includes('what can') || q.includes('how')) {
      return `I can help you with:\n\n• NSFAS: deadlines, amounts, requirements\n• Bursaries: open applications, deadlines\n• All 90 SA institutions: applications, contacts, security, residence\n\nTry asking:\n"NSFAS deadline"\n"Open bursaries"\n"VUT security number"\n"Wits applications"`;
    }

    // 5. FALLBACK
    return `I don't have info on that. I can help with:\n\n• NSFAS & bursaries\n• All SA universities, TVET colleges & private institutions\n\nTry: "NSFAS deadline", "VUT security", or "open bursaries"`;
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    
    setTimeout(() => {
      const reply = getThusoReply(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="school" size={24} color="#8B0000" />
        <Text style={styles.headerTitle}>Thuso AI</Text>
        <Text style={styles.headerSubtitle}>Campus Compass Assistant</Text>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messages} 
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles" size={48} color="#8B0000" />
              <Text style={styles.emptyTitle}>Ask Thuso anything</Text>
              <Text style={styles.empty}>NSFAS deadlines, bursaries, or any SA campus info</Text>
              <View style={styles.suggestions}>
                <TouchableOpacity style={styles.chip} onPress={() => setMessage('NSFAS deadline')}>
                  <Text style={styles.chipText}>NSFAS deadline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip} onPress={() => setMessage('Open bursaries')}>
                  <Text style={styles.chipText}>Open bursaries</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip} onPress={() => setMessage('VUT security')}>
                  <Text style={styles.chipText}>VUT security</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.content}</Text>
            </View>
          ))}
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
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!message.trim() || loading) && styles.sendBtnDisabled]} 
            onPress={sendMessage} 
            disabled={loading || !message.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderColor: '#e5e5e5', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B0000', marginTop: 4 },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  messages: { flex: 1, padding: 16 },
  emptyBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, color: '#333' },
  empty: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 15, lineHeight: 22 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, gap: 8 },
  chip: { 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  chipText: { color: '#8B0000', fontSize: 13, fontWeight: '500' },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#8B0000', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userText: { color: 'white', fontSize: 15, lineHeight: 20 },
  aiText: { color: '#000', fontSize: 15, lineHeight: 22 },
  inputRow: { 
    flexDirection: 'row', 
    padding: 12, 
    borderTopWidth: 1, 
    borderColor: '#e5e5e5', 
    alignItems: 'flex-end',
    backgroundColor: '#fff'
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    marginRight: 8, 
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#fafafa'
  },
  sendBtn: { 
    backgroundColor: '#8B0000', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc'
  }
});