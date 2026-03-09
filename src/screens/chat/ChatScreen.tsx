import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Colors, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { functions } from '../../services/appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { getToolIcon } from '../../constants/toolIcons';
import { useToolsStore } from '../../store/toolsStore';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ChatScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { profile } = useAuthStore();
  const { tools } = useToolsStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestedPrompts = [
    { title: 'Write Ad Copy', icon: 'facebook-ad-copy', prompt: 'Write a compelling Facebook ad for a fitness app', color: '#1877F2' },
    { title: 'Instagram Caption', icon: 'instagram-captions', prompt: 'Generate a viral Instagram caption for a travel agency', color: '#E4405F' },
    { title: 'Email Subject', icon: 'email-subjects', prompt: 'Give me 5 catchy email subject lines for a sale', color: '#EF4444' },
  ];

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const execution = await functions.createExecution(
        'chat-ai',
        JSON.stringify({ user_message: messageText, conversation_history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })) }),
        false,
        '/',
        ExecutionMethod.POST
      );
      
      const result = JSON.parse(execution.responseBody);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'I am ready to help with your marketing!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.log('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatedBackground variant="chat">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botIcon}>
            <Image source={require('../../assets/images/logo-icon.png')} style={{ width: 24, height: 24 }} />
          </View>
          <View>
            <Text style={styles.headerTitle}>MarketBot</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMessages([])}>
          <Feather name="trash-2" size={20} color="#718096" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.botLargeIcon}>
                 <Image source={require('../../assets/images/logo-icon.png')} style={{ width: 60, height: 60 }} />
              </View>
              <Text style={styles.emptyTitle}>Hi! I'm MarketBot</Text>
              <Text style={styles.emptySubtitle}>How can I help you today?</Text>

              <View style={styles.promptsContainer}>
                {suggestedPrompts.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.promptCard} onPress={() => handleSend(p.prompt)}>
                    <View style={[styles.promptIconBg, { backgroundColor: p.color + '15' }]}>
                      <Image source={getToolIcon(p.icon, 'Social')} style={{ width: 24, height: 24 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promptTitle}>{p.title}</Text>
                      <Text style={styles.promptText} numberOfLines={1}>{p.prompt}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#4A5568" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.messageRow, m.role === 'user' ? styles.userRow : styles.botRow]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={styles.messageText}>{m.content}</Text>
                </View>
              </View>
            ))
          )}
          {isTyping && (
            <View style={styles.botRow}>
              <View style={[styles.bubble, styles.botBubble]}>
                <ActivityIndicator size="small" color="#9D4EDD" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#4A5568"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
            >
              <Feather name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161824',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 12,
    color: '#22C55E',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  botLargeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#161824',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    marginBottom: 40,
  },
  promptsContainer: {
    width: '100%',
    gap: 12,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161824',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  promptIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  promptText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  messageRow: {
    marginBottom: 16,
    width: '100%',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  botRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: width * 0.8,
  },
  userBubble: {
    backgroundColor: '#9D4EDD',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#161824',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161824',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9D4EDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;

