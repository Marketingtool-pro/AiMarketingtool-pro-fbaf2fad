import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useToolsStore, Tool, ToolInput } from '../../store/toolsStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Gradients, Spacing, BorderRadius } from '../../constants/theme';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ToolDetail'>;

const ToolDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { toolSlug, prefillInputs } = route.params;
  const { tools, generateContent, isGenerating } = useToolsStore();
  const { user, profile } = useAuthStore();

  const [tool, setTool] = useState<Tool | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [outputCount, setOutputCount] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tones = ['Professional', 'Casual', 'Friendly', 'Persuasive', 'Formal', 'Creative'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Japanese'];

  useEffect(() => {
    const foundTool = tools.find(t => t.slug === toolSlug);
    if (foundTool) {
      setTool(foundTool);
      // Initialize input values (prefill if coming from regenerate)
      const initialValues: Record<string, string> = {};
      foundTool.inputs.forEach(input => {
        initialValues[input.name] = prefillInputs?.[input.name] || '';
      });
      setInputValues(initialValues);
    }
  }, [toolSlug, tools]);

  const handleInputChange = (name: string, value: string) => {
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  const validateInputs = () => {
    if (!tool) return false;
    for (const input of tool.inputs) {
      if (input.required && !inputValues[input.name]?.trim()) {
        Alert.alert('Required Field', `Please fill in ${input.label}`);
        return false;
      }
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validateInputs() || !tool || isGenerating) return;

    // Block PRO tools for free users
    if (tool.isPro && (!profile?.subscription || profile.subscription === 'free')) {
      Alert.alert(
        'Pro Tool',
        'This tool requires a paid plan. Upgrade to unlock all Pro tools.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    // Check daily credit limit for free users (3 per day)
    const dailyLimit = profile?.subscription === 'free' ? 3 :
                       profile?.subscription === 'starter' ? 200 :
                       profile?.subscription === 'pro' ? 500 : 1500;
    const todayUsed = profile?.generationsUsed || 0;

    if (todayUsed >= dailyLimit) {
      Alert.alert(
        'Daily Limit Reached',
        `You've used ${todayUsed}/${dailyLimit} generations today. ${
          profile?.subscription === 'free'
            ? 'Upgrade for more generations.'
            : 'Your limit resets tomorrow.'
        }`,
        [
          { text: 'OK', style: 'cancel' },
          ...(profile?.subscription === 'free'
            ? [{ text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }]
            : []),
        ]
      );
      return;
    }

    // Start elapsed timer
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    try {
      const result = await generateContent(tool.$id, {
        ...inputValues,
        tone: selectedTone,
        language: selectedLanguage,
        outputCount,
        userId: user?.$id || '',
      });

      navigation.navigate('ToolResult', {
        toolSlug: tool.slug,
        result,
        inputs: inputValues,
      });
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Please try again');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const renderInput = (input: ToolInput) => {
    switch (input.type) {
      case 'textarea':
        return (
          <View key={input.name} style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {input.label}
              {input.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={input.placeholder}
              placeholderTextColor={Colors.textTertiary}
              value={inputValues[input.name]}
              onChangeText={(value) => handleInputChange(input.name, value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {input.helperText && (
              <Text style={styles.helperText}>{input.helperText}</Text>
            )}
          </View>
        );

      case 'select':
        return (
          <View key={input.name} style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {input.label}
              {input.required && <Text style={styles.required}> *</Text>}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectOptions}>
                {input.options?.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.selectOption,
                      inputValues[input.name] === option && styles.selectOptionActive,
                    ]}
                    onPress={() => handleInputChange(input.name, option)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        inputValues[input.name] === option && styles.selectOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      default:
        return (
          <View key={input.name} style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {input.label}
              {input.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={input.placeholder}
              placeholderTextColor={Colors.textTertiary}
              value={inputValues[input.name]}
              onChangeText={(value) => handleInputChange(input.name, value)}
            />
            {input.helperText && (
              <Text style={styles.helperText}>{input.helperText}</Text>
            )}
          </View>
        );
    }
  };

  if (!tool) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <LinearGradient colors={Gradients.dark} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.favoriteButton}>
              <Feather name="heart" size={24} color={Colors.white} />
            </View>
          </View>

          <View style={styles.toolInfo}>
            <View style={[styles.toolIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Image 
                source={getToolIcon(tool.slug, tool.category)} 
                style={{ width: 44, height: 44 }} 
                resizeMode="contain" 
              />
            </View>
            <View style={styles.toolMeta}>
              <View style={styles.toolBadges}>
                {tool.isNew && (
                  <View style={[styles.badge, { backgroundColor: Colors.success }]}>
                    <Text style={styles.badgeText}>NEW</Text>
                  </View>
                )}
                {tool.isPro && (
                  <View style={[styles.badge, { backgroundColor: Colors.accent }]}>
                    <Text style={styles.badgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDescription}>{tool.shortDescription}</Text>
            </View>
          </View>

          <View style={styles.toolStats}>
            <View style={styles.statItem}>
              <Feather name="users" size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>{(tool.usageCount / 1000).toFixed(1)}k uses</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="star" size={16} color={Colors.warning} />
              <Text style={styles.statText}>{tool.rating} rating</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="clock" size={16} color={Colors.textSecondary} />
              <Text style={styles.statText}>~10 sec</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dynamic Inputs */}
          {tool.inputs.map(renderInput)}

          {/* Tone Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectOptions}>
                {tones.map((tone) => (
                  <TouchableOpacity
                    key={tone}
                    style={[
                      styles.selectOption,
                      selectedTone.toLowerCase() === tone.toLowerCase() && styles.selectOptionActive,
                    ]}
                    onPress={() => setSelectedTone(tone.toLowerCase())}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        selectedTone.toLowerCase() === tone.toLowerCase() && styles.selectOptionTextActive,
                      ]}
                    >
                      {tone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Language Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectOptions}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.selectOption,
                      selectedLanguage === lang && styles.selectOptionActive,
                    ]}
                    onPress={() => setSelectedLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        selectedLanguage === lang && styles.selectOptionTextActive,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Output Count */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Outputs</Text>
            <View style={styles.outputCountContainer}>
              {[1, 3, 5].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.outputCountBtn,
                    outputCount === count && styles.outputCountBtnActive,
                  ]}
                  onPress={() => setOutputCount(count)}
                >
                  <Text
                    style={[
                      styles.outputCountText,
                      outputCount === count && styles.outputCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Credits Info */}
          {profile?.subscription === 'free' && (
            <View style={styles.creditsInfo}>
              <Feather name="zap" size={20} color={Colors.warning} />
              <Text style={styles.creditsText}>
                {profile?.credits || 0} credits remaining
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
                <Text style={styles.upgradeLink}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Generate Button */}
        <View style={styles.generateContainer}>
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating}
            style={styles.generateButton}
          >
            <LinearGradient colors={Gradients.primary} style={styles.generateGradient}>
              {isGenerating ? (
                <View style={styles.generatingContent}>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.generateText}>
                    {elapsedSeconds >= 5 ? `Still generating... ${elapsedSeconds}s` : `Generating... ${elapsedSeconds}s`}
                  </Text>
                </View>
              ) : (
                <View style={styles.generateContent}>
                  <Feather name="zap" size={24} color={Colors.white} />
                  <Text style={styles.generateText}>Generate Content</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0D0F1C',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  toolIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
    marginRight: Spacing.md,
  },
  toolMeta: {
    flex: 1,
  },
  toolBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  toolName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  toolStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.white,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  selectOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectOptionActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  selectOptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectOptionTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  outputCountContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outputCountBtn: {
    width: 60,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outputCountBtnActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  outputCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  outputCountTextActive: {
    color: Colors.white,
  },
  creditsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  creditsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
  },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  generateContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: 34,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  generateButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  generateGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  generatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  generateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default ToolDetailScreen;
