import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { useToolsStore } from '../../store/toolsStore';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile } = useAuthStore();
  const { tools, fetchTools, generations, fetchGenerations } = useToolsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTools();
    if (user?.$id) fetchGenerations(user.$id);
  }, [user?.$id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTools();
    if (user?.$id) await fetchGenerations(user.$id);
    setRefreshing(false);
  };

  const topPlatforms = [
    { id: 'whatsapp', name: 'WhatsApp', icon: require('../../assets/images/social-icons/06_WhatsApp.png') },
    { id: 'reddit', name: 'Reddit', icon: require('../../assets/images/social-icons/07_Reddit.png') },
    { id: 'telegram', name: 'Telegram', icon: require('../../assets/images/social-icons/24_Telegram.png') },
    { id: 'snapchat', name: 'Snapchat', icon: require('../../assets/images/social-icons/09_Snapchat.png') },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* Top Row: Social Icons with Locks (Match Screenshot 1:31) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topPlatformsRow} contentContainerStyle={styles.topPlatformsContent}>
          {topPlatforms.map((p) => (
            <TouchableOpacity key={p.id} style={styles.topPlatformCard} onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.topPlatformGlass}>
                <Image source={p.icon} style={styles.topPlatformIcon} resizeMode="contain" />
                <View style={styles.lockBadge}>
                  <Feather name="lock" size={10} color="#F59E0B" />
                </View>
              </LinearGradient>
              <Text style={styles.topPlatformName}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categories Section (Tall Rich Cards) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tools')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          <TouchableOpacity style={styles.tallCategoryCard} onPress={() => navigation.navigate('Tools', { platform: 'instagram' })}>
            <LinearGradient colors={['#E4405F40', '#0D0F1C']} style={styles.tallCardGradient}>
              <Image source={require('../../assets/images/tool-icons-v2/instagram-3d.png')} style={styles.tallCardIcon} />
              <View style={styles.tallCardContent}>
                <View style={styles.categoryInfoRow}>
                  <Feather name="instagram" size={16} color="#FFF" />
                  <Text style={styles.tallCardTitle}>Instagram</Text>
                </View>
                <View style={styles.tallCardCircle}>
                  <Feather name="chevron-right" size={14} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tallCategoryCard} onPress={() => navigation.navigate('Tools', { platform: 'social-media' })}>
            <LinearGradient colors={['#7C3AED40', '#0D0F1C']} style={styles.tallCardGradient}>
              <Image source={require('../../assets/images/tool-icons-v2/social-media-3d.png')} style={styles.tallCardIcon} />
              <View style={styles.tallCardContent}>
                <View style={styles.categoryInfoRow}>
                  <Feather name="share-2" size={16} color="#FFF" />
                  <Text style={styles.tallCardTitle}>Social Media</Text>
                </View>
                <View style={styles.tallCardCircle}>
                  <Feather name="chevron-right" size={14} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Popular Tools Section (Match Screenshot 1:31) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Tools</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tools')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>

        <View style={styles.richToolList}>
          {/* Tool Item 1 */}
          <TouchableOpacity style={styles.richToolItem}>
            <View style={styles.richToolLeft}>
              <View style={styles.richToolIconWrap}>
                <Image source={require('../../assets/images/tool-icons-v2/marketing-strategy-3d.png')} style={styles.richToolIcon} />
              </View>
              <View>
                <View style={styles.richToolNameRow}>
                  <Text style={styles.richToolName}>Instagram Caption</Text>
                  <Feather name="trending-up" size={12} color="#10B981" style={{marginLeft: 6}} />
                </View>
                <Text style={styles.richToolSub}>Social</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#605E5C" />
          </TouchableOpacity>

          {/* Premium Trial Nudge (MATCH SCREENSHOT) */}
          {(!profile?.subscription || profile.subscription === 'free') && (
            <TouchableOpacity style={styles.richNudge} onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient colors={['#FFD700', '#F59E0B']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.nudgeGradient}>
                <View style={styles.nudgeContent}>
                  <Image source={require('../../assets/images/tool-icons-v2/trophy.png')} style={styles.nudgeIcon} />
                  <View style={{flex: 1}}>
                    <Text style={styles.nudgeTitle}>Start 7-Day Free Trial</Text>
                    <Text style={styles.nudgeSub}>Unlock Pro & Real-Time Ad Data</Text>
                  </View>
                  <Feather name="arrow-right" size={20} color="#000" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Tool Item 2 */}
          <TouchableOpacity style={styles.richToolItem}>
            <View style={styles.richToolLeft}>
              <View style={styles.richToolIconWrap}>
                <Image source={require('../../assets/images/tool-icons-v2/product-trolley-3d.png')} style={styles.richToolIcon} />
              </View>
              <View>
                <View style={styles.richToolNameRow}>
                  <Text style={styles.richToolName}>Product Description</Text>
                  <Feather name="trending-up" size={12} color="#10B981" style={{marginLeft: 6}} />
                </View>
                <Text style={styles.richToolSub}>E-commerce</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#605E5C" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#0D0F1C' },
  scrollContent: { paddingBottom: 40 },
  topPlatformsRow: { marginTop: 60, marginBottom: 24 },
  topPlatformsContent: { paddingHorizontal: 16, gap: 12 },
  topPlatformCard: { alignItems: 'center' },
  topPlatformGlass: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  topPlatformIcon: { width: 36, height: 36 },
  lockBadge: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B40' },
  topPlatformName: { color: '#FFF', fontSize: 11, marginTop: 8, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  seeAll: { color: '#7C3AED', fontWeight: '700' },
  categoriesContent: { paddingHorizontal: 16, gap: 16 },
  tallCategoryCard: { width: 160, height: 240, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tallCardGradient: { flex: 1, padding: 20, justifyContent: 'space-between' },
  tallCardIcon: { width: 120, height: 120, alignSelf: 'center', marginTop: 10 },
  tallCardContent: { alignItems: 'flex-start' },
  categoryInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tallCardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  tallCardCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  richToolList: { paddingHorizontal: 16, gap: 12 },
  richToolItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161824', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  richToolLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  richToolIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1E1B4B', justifyContent: 'center', alignItems: 'center' },
  richToolIcon: { width: 32, height: 32 },
  richToolNameRow: { flexDirection: 'row', alignItems: 'center' },
  richToolName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  richToolSub: { color: '#A1A1AA', fontSize: 12, marginTop: 2 },
  richNudge: { borderRadius: 24, overflow: 'hidden' },
  nudgeGradient: { padding: 20 },
  nudgeContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nudgeIcon: { width: 48, height: 48 },
  nudgeTitle: { color: '#000', fontSize: 18, fontWeight: '800' },
  nudgeSub: { color: 'rgba(0,0,0,0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 },
});

export default DashboardScreen;