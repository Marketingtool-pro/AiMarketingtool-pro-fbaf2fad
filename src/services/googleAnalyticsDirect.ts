import gcpAuthService from './gcpAuthService';

const GA4_DATA_API_URL = 'https://analyticsdata.googleapis.com/v1beta';

export interface AnalyticsReport {
  activeUsers: number;
  sessions: number;
  screenViews: number;
  conversions: number;
}

export const googleAnalyticsDirect = {
  /**
   * Fetches REAL traffic and conversion data from Google Analytics 4 (GA4).
   * This works immediately without the "Basic Access" restriction.
   */
  async getTrafficStats(propertyId: string): Promise<AnalyticsReport> {
    try {
      const accessToken = await gcpAuthService.getGCPAccessToken();
      if (!accessToken) throw new Error('Unauthorized: No GCP Access Token');

      // GA4 Data API Request (Last 30 Days)
      const response = await fetch(`${GA4_DATA_API_URL}/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'conversions' }
          ]
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GA4 API Error: ${error.error?.message || 'Unknown'}`);
      }

      const data = await response.json();
      
      // Map row data to our clean object
      const metrics = data.rows?.[0]?.metricValues || [];
      return {
        activeUsers: parseInt(metrics[0]?.value || '0'),
        sessions: parseInt(metrics[1]?.value || '0'),
        screenViews: parseInt(metrics[2]?.value || '0'),
        conversions: parseInt(metrics[3]?.value || '0'),
      };

    } catch (error: any) {
      console.error('[GA4 Direct] Fetch failed:', error.message);
      throw error;
    }
  }
};

export default googleAnalyticsDirect;
