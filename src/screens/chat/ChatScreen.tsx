import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { functions } from '../../services/appwrite';
import { useToolsStore, TOOL_CATEGORIES, Tool } from '../../store/toolsStore';
import { getToolIcon } from '../../constants/toolIcons';

const { width } = Dimensions.get('window');

// Chat bot image (kept for fallback but not shown in header)
const ChatBotImage = require('../../assets/images/screens/chat-bot.jpg');

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
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [toolCategory, setToolCategory] = useState<string | null>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { tools } = useToolsStore();

  const filteredChatTools = useMemo(() => {
    if (!toolCategory) return tools.slice(0, 10);
    return tools.filter(t => t.category === toolCategory);
  }, [toolCategory, tools]);

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
      color: Colors.accent,
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

  // AI Chat via Appwrite Function
  const callWindmillChat = async (userMessage: string, history: Message[]): Promise<string> => {
    const conversationHistory = history.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const execution = await functions.createExecution(
        'chat-ai',
        JSON.stringify({
          message: userMessage,
          messages: conversationHistory.length > 0
            ? [...conversationHistory, { role: 'user', content: userMessage }]
            : undefined,
          user_message: userMessage,
          conversation_history: conversationHistory,
        }),
        false,
        '/'
      );

      const result = JSON.parse(execution.responseBody);
      return result.response || result.content || result.message || 'Sorry, I could not process that.';
    } catch (error) {
      if (__DEV__) console.error('[Chat] Appwrite function error:', error);
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
          <Text style={styles.headerTitle}>AI Chat</Text>
        </View>
        <View style={styles.headerActions}>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Feather name="trash-2" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
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
              <Text style={styles.emptyTitle}>Your AI Marketing Assistant</Text>
              <Text style={styles.emptySubtitle}>Ask anything about marketing</Text>

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
                <View style={styles.toolsTabContainer}>
                  {/* Same tools banner */}
                  <View style={styles.sameToolsBanner}>
                    <Feather name="check-circle" size={18} color={Colors.success} />
                    <Text style={styles.sameToolsBannerText}>
                      Same tools as web · Same AI · Same backend · Full execution
                    </Text>
                  </View>

                  {/* Category filter chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolCategoryScroll} contentContainerStyle={styles.toolCategoryContent}>
                    <TouchableOpacity
                      style={[styles.toolCategoryChip, !toolCategory && styles.toolCategoryChipActive]}
                      onPress={() => setToolCategory(null)}
                    >
                      <Text style={[styles.toolCategoryChipText, !toolCategory && styles.toolCategoryChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {TOOL_CATEGORIES.slice(0, 6).map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.toolCategoryChip, toolCategory === cat.id && styles.toolCategoryChipActive]}
                        onPress={() => setToolCategory(cat.id)}
                      >
                        <Text style={[styles.toolCategoryChipText, toolCategory === cat.id && styles.toolCategoryChipTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Tool count removed — policy compliance */}

                  {/* Tool cards with Run button */}
                  {filteredChatTools.map((tool) => (
                    <TouchableOpacity
                      key={tool.$id}
                      style={styles.toolRunCard}
                      onPress={() => navigation.navigate('ToolDetail', { toolSlug: tool.slug })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.toolRunIconWrap}>
                        <Image source={getToolIcon(tool.slug, tool.category)} style={styles.toolRunIcon} />
                      </View>
                      <View style={styles.toolRunInfo}>
                        <Text style={styles.toolRunName} numberOfLines={1}>{tool.name}</Text>
                        <Text style={styles.toolRunDesc} numberOfLines={1}>{tool.shortDescription}</Text>
                        <View style={styles.toolRunMeta}>
                          <Feather name="star" size={12} color={Colors.gold} />
                          <Text style={styles.toolRunRating}>{tool.rating}</Text>
                          <Text style={styles.toolRunUses}>{tool.usageCount} uses</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.toolRunButton}
                        onPress={() => navigation.navigate('ToolDetail', { toolSlug: tool.slug })}
                      >
                        <Feather name="play" size={14} color={Colors.white} />
                        <Text style={styles.toolRunButtonText}>Run</Text>
                      </TouchableOpacity>
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
            </>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>

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
  messageBubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.accent,
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
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.accent + '50',
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
    backgroundColor: Colors.accent,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
  },
  // Tools Tab
  toolsTabContainer: {
    width: width - 48,
  },
  sameToolsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sameToolsBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.success,
    flex: 1,
  },
  toolCategoryScroll: {
    marginBottom: Spacing.sm,
  },
  toolCategoryContent: {
    gap: Spacing.sm,
  },
  toolCategoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  toolCategoryChipActive: {
    backgroundColor: Colors.accent,
  },
  toolCategoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  toolCategoryChipTextActive: {
    color: Colors.white,
  },
  toolsTabCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  toolRunCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  toolRunIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  toolRunIcon: {
    width: 36,
    height: 36,
  },
  toolRunInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  toolRunName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  toolRunDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toolRunMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  toolRunRating: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '500',
  },
  toolRunUses: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  toolRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  toolRunButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
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
    backgroundColor: Colors.accent,
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
