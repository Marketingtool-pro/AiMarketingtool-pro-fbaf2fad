import { create } from 'zustand';
import { dbService, COLLECTIONS, Query, client, DATABASE_ID } from '../services/appwrite';
import { Models } from 'react-native-appwrite';
import { useAuthStore } from './authStore';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface RecentActivity {
  id: string;
  type: 'generation' | 'favorite' | 'login' | 'subscription';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type DateRange = '7d' | '30d' | 'all';

interface DashboardState {
  metrics: DashboardMetric[];
  performanceData: PerformanceDataPoint[];
  recentActivities: RecentActivity[];
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;

  fetchDashboardData: (userId: string) => Promise<void>;
  setupRealtimeListeners: (userId: string) => () => void;
  setDateRange: (range: DateRange) => void;
  setMetrics: (metrics: DashboardMetric[]) => void;
  setPerformanceData: (data: PerformanceDataPoint[]) => void;
  setRecentActivities: (activities: RecentActivity[]) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  metrics: [],
  performanceData: [],
  recentActivities: [],
  dateRange: '7d',
  isLoading: false,
  error: null,

  setDateRange: (dateRange) => {
    set({ dateRange });
    const { user } = useAuthStore.getState();
    if (user?.$id) {
      get().fetchDashboardData(user.$id);
    }
  },

  setMetrics: (metrics) => set({ metrics }),
  setPerformanceData: (performanceData) => set({ performanceData }),
  setRecentActivities: (recentActivities) => set({ recentActivities }),

  fetchDashboardData: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch real generations
      const generationsResult = await dbService.listDocuments(
        COLLECTIONS.GENERATIONS,
        [Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(100)]
      );

      const generations = generationsResult.documents;
      const totalGenerations = generations.length;

      // Fetch real credit usage
      let creditsUsed = 0;
      try {
        const creditResult = await dbService.listDocuments(
          COLLECTIONS.CREDIT_USAGE,
          [Query.equal('userId', userId), Query.limit(100)]
        );
        creditsUsed = creditResult.documents.reduce((sum: number, d: any) => sum + (d.credits || 1), 0);
      } catch (_) {}

      // Fetch real subscription
      let plan = 'Free Trial';
      try {
        const subResult = await dbService.listDocuments(
          COLLECTIONS.SUBSCRIPTIONS,
          [Query.equal('userId', userId), Query.limit(1)]
        );
        if (subResult.documents.length > 0) {
          const tier = (subResult.documents[0] as any).tier || 'free';
          const tierNames: Record<string, string> = {
            free: 'Free Trial', starter: 'Starter', pro: 'Professional',
            alltools: 'Growth', enterprise: 'Enterprise', agency: 'Agency'
          };
          plan = tierNames[tier] || tier;
        }
      } catch (_) {}

      // Count unique tools used
      const uniqueTools = new Set(generations.map((g: any) => g.toolId || g.toolName)).size;

      // Count favorites
      let favCount = 0;
      try {
        const favResult = await dbService.listDocuments(
          COLLECTIONS.FAVORITES,
          [Query.equal('userId', userId), Query.limit(100)]
        );
        favCount = favResult.documents.length;
      } catch (_) {}

      // REAL metrics — no fake multipliers
      const metrics: DashboardMetric[] = [
        { id: 'gen', label: 'Generations', value: totalGenerations, change: 0, trend: 'neutral', icon: 'zap', color: '#7C3AED' },
        { id: 'tools', label: 'Tools Used', value: uniqueTools, change: 0, trend: 'neutral', icon: 'grid', color: '#4285F4' },
        { id: 'credits', label: 'Credits Used', value: creditsUsed || totalGenerations, change: 0, trend: 'neutral', icon: 'activity', color: '#01B574' },
        { id: 'saved', label: 'Saved', value: favCount, change: 0, trend: 'neutral', icon: 'bookmark', color: '#FFB547' },
      ];

      // Real performance data — actual generations per day (zeros when no data)
      const performanceData: PerformanceDataPoint[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = generations.filter((g: any) => g.createdAt?.startsWith(dateStr)).length;
        performanceData.push({ date: dateStr, value: count });
      }

      // Real recent activities
      const recentActivities: RecentActivity[] = generations.slice(0, 10).map((g: any) => ({
        id: g.$id,
        type: 'generation' as const,
        title: g.toolName || 'AI Generation',
        description: `Generated ${g.outputType || 'content'}`,
        timestamp: g.createdAt,
        metadata: { toolId: g.toolId }
      }));

      set({ metrics, performanceData, recentActivities, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setupRealtimeListeners: (userId: string) => {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.GENERATIONS}.documents`;

    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload as any;
      if (payload.userId === userId) {
        get().fetchDashboardData(userId);
      }
    });

    return unsubscribe;
  },
}));
