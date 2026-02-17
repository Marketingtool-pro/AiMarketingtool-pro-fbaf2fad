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
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Chat bot image
const ChatBotImage = require('../../assets/images/screens/chat-bot.jpg');
const AiAssistantImage = require('../../assets/images/screens/ai-assistant.jpg');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SuggestedPrompt {
  icon: string;
  title: string;
  description: string;
  prompt: string;
  color: string;
}

// Animated Ripple Component (LiMo style)
const AnimatedRipple = () => {
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createRippleAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      );
    };

    Animated.parallel([
      createRippleAnimation(ripple1, 0),
      createRippleAnimation(ripple2, 1000),
      createRippleAnimation(ripple3, 2000),
    ]).start();
  }, []);

  const createRippleStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 280],
    }),
    height: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 280],
    }),
    borderRadius: 140,
    borderWidth: 2,
    borderColor: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['rgba(175, 21, 195, 0.6)', 'rgba(175, 21, 195, 0.3)', 'rgba(175, 21, 195, 0)'],
    }),
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  });

  return (
    <View style={styles.rippleContainer}>
      <Animated.View style={createRippleStyle(ripple1)} />
      <Animated.View style={createRippleStyle(ripple2)} />
      <Animated.View style={createRippleStyle(ripple3)} />
    </View>
  );
};

// LiMo Bot Icon Component
const BotIcon = ({ size = 80, animated = true }: { size?: number; animated?: boolean }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  return (
    <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
      <LinearGradient
        colors={['#FF6B9D', '#C44569']}
        style={[styles.botIcon, { width: size, height: size, borderRadius: size * 0.25 }]}
      >
        {/* Bot Eyes */}
        <View style={styles.botEyesContainer}>
          <View style={[styles.botEye, { width: size * 0.22, height: size * 0.22 }]} />
          <View style={[styles.botEye, { width: size * 0.22, height: size * 0.22 }]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Chat capability tabs
interface ChatCapability {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
}

const ChatScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const typingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Full chat capabilities - NOT shortcuts
  const chatCapabilities: ChatCapability[] = [
    {
      id: 'ads',
      name: 'Ad Creation',
      icon: 'target',
      color: '#FF6B6B',
      description: 'Create ads for any platform',
      features: ['Google Ads', 'Facebook Ads', 'Instagram Ads', 'TikTok Ads', 'LinkedIn Ads'],
    },
    {
      id: 'content',
      name: 'Content Writing',
      icon: 'edit-3',
      color: '#4ECDC4',
      description: 'Write any marketing content',
      features: ['Blog Posts', 'Product Descriptions', 'Landing Pages', 'Press Releases', 'Case Studies'],
    },
    {
      id: 'email',
      name: 'Email Marketing',
      icon: 'mail',
      color: '#FFE66D',
      description: 'Create email campaigns',
      features: ['Subject Lines', 'Welcome Series', 'Abandoned Cart', 'Newsletters', 'Promotional'],
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: 'share-2',
      color: '#A78BFA',
      description: 'Social content creation',
      features: ['Instagram', 'Twitter/X', 'LinkedIn', 'TikTok', 'Facebook'],
    },
    {
      id: 'seo',
      name: 'SEO & Keywords',
      icon: 'search',
      color: '#34D399',
      description: 'SEO optimization help',
      features: ['Meta Tags', 'Keyword Research', 'Content Optimization', 'Schema Markup', 'Link Building'],
    },
    {
      id: 'strategy',
      name: 'Strategy',
      icon: 'trending-up',
      color: '#F472B6',
      description: 'Marketing strategy advice',
      features: ['Campaign Planning', 'Audience Analysis', 'Competitor Research', 'Budget Allocation', 'ROI Analysis'],
    },
  ];

  const suggestedPrompts: SuggestedPrompt[] = [
    {
      icon: 'edit-3',
      title: 'Write Ad Copy',
      description: 'Create compelling ads',
      prompt: 'Write a compelling Facebook ad copy for a fitness app',
      color: Colors.gold,
    },
    {
      icon: 'trending-up',
      title: 'Marketing Strategy',
      description: 'Get expert advice',
      prompt: 'Give me a marketing strategy for launching a new product',
      color: Colors.cyan,
    },
    {
      icon: 'mail',
      title: 'Email Campaign',
      description: 'Generate emails',
      prompt: 'Generate 5 email subject lines for a product launch',
      color: Colors.secondary,
    },
    {
      icon: 'instagram',
      title: 'Social Content',
      description: 'Create viral posts',
      prompt: 'Create an engaging Instagram caption for a travel photo',
      color: Colors.purple,
    },
  ];

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [isTyping]);

  // Pulse animation for input border
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

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
    scrollToBottom();

    try {
      // Call REAL Windmill AI
      const response = await callWindmillChat(messageText, messages);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if (__DEV__) console.error('[Chat] AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  // REAL Windmill AI Chat Function
  const callWindmillChat = async (userMessage: string, history: Message[]): Promise<string> => {
    const WINDMILL_BASE = 'https://wm.marketingtool.pro';
    const WINDMILL_WORKSPACE = 'marketingtool-pro';
    const WINDMILL_TOKEN = 'wm_token_marketingtool_2024';

    // Build conversation history for context
    const conversationHistory = history.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = `You are MarketBot, an expert AI marketing assistant for MarketingTool.pro.
You help users with:
- Writing ad copy (Google Ads, Facebook, Instagram)
- Marketing strategies and campaigns
- Email marketing and subject lines
- Social media content
- SEO optimization
- E-commerce product descriptions

Be helpful, specific, and provide actionable advice. Use formatting with bullet points and sections when appropriate.`;

    try {
      const response = await fetch(
        `${WINDMILL_BASE}/api/w/${WINDMILL_WORKSPACE}/jobs/run_wait_result/p/f/mobile/chat_ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WINDMILL_TOKEN}`,
          },
          body: JSON.stringify({
            system_prompt: systemPrompt,
            user_message: userMessage,
            conversation_history: conversationHistory,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result.response || result.content || result;
    } catch (error) {
      if (__DEV__) console.error('[Chat] Windmill error:', error);
      // Fallback to helpful response
      return generateFallbackResponse(userMessage);
    }
  };

  // Fallback when API is unavailable
  const generateFallbackResponse = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('ad') || lowerPrompt.includes('copy')) {
      return `Here's a compelling ad framework for you:\n\n📱 **Ad Copy Structure:**\n\n**Hook:** Grab attention in the first line\n**Problem:** Address the pain point\n**Solution:** Present your offer\n**Proof:** Add social proof or benefits\n**CTA:** Clear call to action\n\nWant me to write specific copy? Tell me about your product!`;
    }

    if (lowerPrompt.includes('email') || lowerPrompt.includes('subject')) {
      return `Here are 5 high-converting email subject lines:\n\n1. 🚀 [Benefit] in just [Timeframe]\n2. Don't miss: [Offer] ends tonight\n3. Quick question about [Topic]...\n4. You're invited: [Event/Offer]\n5. The #1 mistake in [Industry]\n\nWhich style fits your campaign?`;
    }

    if (lowerPrompt.includes('strategy') || lowerPrompt.includes('plan')) {
      return `Here's a marketing strategy framework:\n\n📊 **Marketing Plan:**\n\n**1. Define Goals**\n• Revenue targets\n• Lead generation\n• Brand awareness\n\n**2. Know Your Audience**\n• Demographics\n• Pain points\n• Buying behavior\n\n**3. Choose Channels**\n• Paid ads\n• Content marketing\n• Social media\n• Email\n\n**4. Create Content**\n• Value-driven\n• Consistent brand\n• Clear CTAs\n\nWant me to dive deeper into any area?`;
    }

    return `Great question! As your AI marketing assistant, I can help you with:\n\n🎯 **What I Do Best:**\n• Write compelling ad copy\n• Create marketing strategies\n• Generate email campaigns\n• Optimize for conversions\n• Social media content\n\nWhat specific marketing challenge can I help you solve today?`;
  };

  const handlePromptPress = (prompt: string) => {
    handleSend(prompt);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.messageAvatarContainer}>
            <BotIcon size={32} animated={false} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.content}
          </Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BotIcon size={40} animated={false} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>MarketBot</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Feather name="trash-2" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={styles.creditsContainer}>
            <Feather name="zap" size={14} color={Colors.gold} />
            <Text style={styles.creditsText}>400</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              {/* AI Bot Image with Ripples */}
              <View style={styles.botSection}>
                <AnimatedRipple />
                <View style={styles.botImageContainer}>
                  <Image source={ChatBotImage} style={styles.botImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(175, 21, 195, 0.3)']}
                    style={styles.botImageOverlay}
                  />
                </View>
              </View>

              <Text style={styles.emptyTitle}>Hi, I'm MarketBot!</Text>
              <Text style={styles.emptySubtitle}>Your AI Marketing Assistant powered by Claude</Text>

              {/* Tab Navigation */}
              <View style={styles.tabNav}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
                  onPress={() => setActiveTab('chat')}
                >
                  <Feather name="message-circle" size={18} color={activeTab === 'chat' ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'capabilities' && styles.tabItemActive]}
                  onPress={() => setActiveTab('capabilities')}
                >
                  <Feather name="grid" size={18} color={activeTab === 'capabilities' ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'capabilities' && styles.tabTextActive]}>Tools</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
                  onPress={() => setActiveTab('history')}
                >
                  <Feather name="clock" size={18} color={activeTab === 'history' ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'chat' && (
                <>
                  {/* Input with gradient border */}
                  <Animated.View style={[styles.inputPreview, { transform: [{ scale: pulseAnim }] }]}>
                    <LinearGradient
                      colors={['#C44569', '#6441A5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.inputPreviewGradient}
                    >
                      <View style={styles.inputPreviewInner}>
                        <Text style={styles.inputPreviewText}>Ask about marketing...</Text>
                        <View style={styles.inputPreviewSend}>
                          <Feather name="send" size={18} color={Colors.textSecondary} />
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Quick Prompts */}
                  <View style={styles.promptsGrid}>
                    {suggestedPrompts.map((prompt, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.promptCard}
                        onPress={() => handlePromptPress(prompt.prompt)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.promptIcon, { backgroundColor: prompt.color + '20' }]}>
                          <Feather name={prompt.icon as any} size={20} color={prompt.color} />
                        </View>
                        <View style={styles.promptTextContainer}>
                          <Text style={styles.promptTitle}>{prompt.title}</Text>
                          <Text style={styles.promptDescription}>{prompt.description}</Text>
                        </View>
                        <Text style={[styles.promptArrow, { color: prompt.color }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {activeTab === 'capabilities' && (
                <View style={styles.capabilitiesGrid}>
                  {chatCapabilities.map((cap, index) => (
                    <TouchableOpacity
                      key={cap.id}
                      style={styles.capabilityCard}
                      onPress={() => handlePromptPress(`Help me with ${cap.name.toLowerCase()}: ${cap.features[0]}`)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[cap.color + '30', cap.color + '10']}
                        style={styles.capabilityGradient}
                      >
                        <View style={[styles.capabilityIconContainer, { backgroundColor: cap.color + '25' }]}>
                          <Feather name={cap.icon as any} size={24} color={cap.color} />
                        </View>
                        <Text style={styles.capabilityName}>{cap.name}</Text>
                        <Text style={styles.capabilityDesc}>{cap.description}</Text>
                        <View style={styles.capabilityFeatures}>
                          {cap.features.slice(0, 3).map((feat, i) => (
                            <View key={i} style={[styles.featureTag, { borderColor: cap.color + '40' }]}>
                              <Text style={[styles.featureText, { color: cap.color }]}>{feat}</Text>
                            </View>
                          ))}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeTab === 'history' && (
                <View style={styles.historySection}>
                  <View style={styles.historyEmpty}>
                    <Feather name="message-square" size={48} color={Colors.textTertiary} />
                    <Text style={styles.historyEmptyText}>No chat history yet</Text>
                    <Text style={styles.historyEmptySubtext}>Start a conversation to see your history</Text>
                    <TouchableOpacity style={styles.startChatBtn} onPress={() => setActiveTab('chat')}>
                      <Text style={styles.startChatBtnText}>Start Chatting</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <>
              {messages.map(renderMessage)}
              {isTyping && (
                <View style={styles.typingContainer}>
                  <View style={styles.messageAvatarContainer}>
                    <BotIcon size={32} animated={false} />
                  </View>
                  <View style={styles.typingBubble}>
                    <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
                    <Animated.View
                      style={[
                        styles.typingDot,
                        { opacity: typingAnim, marginHorizontal: 4 },
                      ]}
                    />
                    <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
                  </View>
                </View>
              )}
            </>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Bot Icon when in chat */}
        {messages.length > 0 && (
          <View style={styles.floatingBot}>
            <BotIcon size={50} animated={true} />
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['#C44569', '#6441A5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inputGradientBorder}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ask me anything..."
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isTyping}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Feather name="send" size={20} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: Colors.success,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  creditsText: {
    color: Colors.gold,
    fontWeight: '600',
    fontSize: 14,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  botSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    height: 220,
  },
  rippleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 280,
  },
  botImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#C44569',
    shadowColor: '#C44569',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  botImage: {
    width: '100%',
    height: '100%',
  },
  botImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  botIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C44569',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  botEyesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  botEye: {
    backgroundColor: Colors.white,
    borderRadius: 100,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputPreview: {
    width: width - 48,
    marginBottom: Spacing.xl,
  },
  inputPreviewGradient: {
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  inputPreviewInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full - 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  inputPreviewText: {
    flex: 1,
    color: Colors.textTertiary,
    fontSize: 16,
  },
  inputPreviewSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptsGrid: {
    width: '100%',
    gap: Spacing.sm,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  promptDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  promptArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.secondary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: Colors.white,
    lineHeight: 24,
  },
  userMessageText: {
    color: Colors.white,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    padding: Spacing.md,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
  floatingBot: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    shadowColor: '#C44569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  inputContainer: {
    padding: Spacing.md,
    paddingBottom: 34,
    backgroundColor: Colors.background,
  },
  inputGradientBorder: {
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full - 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
    maxHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.secondary + '50',
  },
  // Tab Navigation Styles
  tabNav: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    width: width - 48,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: Colors.secondary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
  },
  // Capabilities Grid
  capabilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: width - 48,
    gap: Spacing.md,
  },
  capabilityCard: {
    width: (width - 48 - Spacing.md) / 2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  capabilityGradient: {
    padding: Spacing.md,
    minHeight: 160,
  },
  capabilityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  capabilityName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  capabilityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  capabilityFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // History Section
  historySection: {
    width: width - 48,
    paddingVertical: Spacing.xl,
  },
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  historyEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginTop: Spacing.md,
  },
  historyEmptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  startChatBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  startChatBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ChatScreen;
