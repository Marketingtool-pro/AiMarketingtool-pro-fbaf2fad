import gcpAuthService from './gcpAuthService';

const GOOGLE_ADS_API_VERSION = 'v17';
const DEVELOPER_TOKEN = 'P9XpJTy27ySZchM9WTVmQw'; // Real Developer Token from your screenshot

export interface CampaignPerformance {
  id: string;
  name: string;
  clicks: number;
  impressions: number;
  cost: number;
  ctr: number;
}

export const googleAdsDirect = {
  /**
   * Fetches REAL campaign performance data directly from the Google Ads API.
   * This ensures compliance with USA Governance and data transparency.
   */
  async getCampaignPerformance(customerId: string): Promise<CampaignPerformance[]> {
    try {
      const accessToken = await gcpAuthService.getGCPAccessToken();
      if (!accessToken) throw new Error('Unauthorized: No GCP Access Token');

      const endpoint = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`;

      // GAQL Query for Real Performance Data
      const query = `
        SELECT 
          campaign.id, 
          campaign.name, 
          metrics.clicks, 
          metrics.impressions, 
          metrics.cost_micros, 
          metrics.ctr 
        FROM campaign 
        WHERE segments.date DURING LAST_30_DAYS
      `;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': DEVELOPER_TOKEN,
          'login-customer-id': customerId // Required for MCC accounts
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Ads API Error: ${error.error?.message || 'Unknown'}`);
      }

      const data = await response.json();
      
      // Map raw response to clean CampaignPerformance objects
      return data.results.map((row: any) => ({
        id: row.campaign.id,
        name: row.campaign.name,
        clicks: parseInt(row.metrics.clicks || '0'),
        impressions: parseInt(row.metrics.impressions || '0'),
        cost: parseFloat(row.metrics.costMicros || '0') / 1000000, // Convert micros to standard currency
        ctr: parseFloat(row.metrics.ctr || '0'),
      }));

    } catch (error: any) {
      console.error('[Ads Direct] Fetch failed:', error.message);
      throw error;
    }
  }
};

export default googleAdsDirect;
