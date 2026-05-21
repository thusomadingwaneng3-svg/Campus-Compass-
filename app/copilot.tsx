import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const API_URL = 'https://campus-compass-thuso.vercel.app/api/copilot';

export default function CopilotScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  // Animations
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // useNativeDriver only on native
  const useNativeDriver = Platform.OS!== 'web';

  const quickPrompts = ['Apply for NSFAS', 'Check my APS', 'Find bursaries for me', 'Saved bursaries'];

  useEffect(() => {
    loadUserContext();
    loadChatHistory();
    startBlobAnimation();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('copilotHistory', JSON.stringify(messages));
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

  const loadUserContext = async () => {
    const [aps, course, campus, name] = await Promise.all([
      AsyncStorage.getItem('userAPS'),
      AsyncStorage.getItem('userCourse'),
      AsyncStorage.getItem('userCampus'),
      AsyncStorage.getItem('userName')
    ]);
    setUserContext({ aps, course, campus, name });
  };

  const loadChatHistory = async () => {
    const history = await AsyncStorage.getItem('copilotHistory');
    if (history) setMessages(JSON.parse(history));
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
            try {
              setMessages([]);
              await AsyncStorage.removeItem('copilotHistory');
            } catch (e) {
              console.log('Failed to clear chat:', e);
            }
          }
        }
      ]
    );
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, userContext })
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had an issue connecting. Check your internet and try again.'
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient colors={['#FFF5F5', '#FFE8E8', '#FFF']} style={{ flex: 1 }}>
        {/* Animated Blobs */}
        <Animated.View style={[styles.blob, styles.blob1, blob1Transform]} />
        <Animated.View style={[styles.blob, styles.blob2, blob2Transform]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={24} color="#E63946" />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.headerTitle}>Campus Copilot</Text>
              <Text style={styles.headerSubtitle}>AI + Your Data</Text>
            </View>
          </View>

          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={20} color="#E63946" />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Prompts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickBar}>
          {quickPrompts.map(p => (
            <TouchableOpacity key={p} onPress={() => setMessage(p)} style={styles.quickPrompt}>
              <Text style={styles.quickPromptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios'? 'padding' : 'height'}
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
                <Ionicons name="sparkles" size={48} color="#E63946" />
                <Text style={styles.emptyTitle}>Ask Copilot anything</Text>
                <Text style={styles.empty}>
                  I use your profile to help you apply faster.
                  {!userContext.aps && ' Go to Profile to add your APS and course first.'}
                </Text>

                <TouchableOpacity onPress={() => router.push('/aps')} style={styles.apsQuickBtn}>
                  <Ionicons name="calculator" size={20} color="white" />
                  <Text style={styles.apsQuickBtnText}>Calculate My APS Score</Text>
                </TouchableOpacity>
              </View>
            )}

            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user'? styles.userBubble : styles.aiBubble]}>
                <Text style={m.role === 'user'? styles.userText : styles.aiText}>{m.content}</Text>
              </View>
            ))}

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
              placeholder="Ask Copilot to help you apply..."
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
  blob1: {
    top: '10%',
    left: '-20%'
  },
  blob2: {
    bottom: '15%',
    right: '-25%'
  },

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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1D1D1D' },
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

  quickBar: { maxHeight: 40, paddingHorizontal: 12, paddingVertical: 8, zIndex: 1 },
  quickPrompt: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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

  bubble: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    maxWidth: '85%'
  },
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
    borderRadius: 24,
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
  sendBtnDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 }
});