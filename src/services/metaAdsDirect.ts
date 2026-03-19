import { account } from './appwrite';

const META_GRAPH_API_VERSION = 'v19.0';

export interface MetaCampaignPerformance {
  id: string;
  name: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
}

export const metaAdsDirect = {
  /**
   * Fetches REAL campaign performance data directly from Meta Graph API.
   * This ensures compliance and removes any 'fake' or 'demo' data.
   */
  async getCampaignPerformance(adAccountId: string, accessToken: string): Promise<MetaCampaignPerformance[]> {
    try {
      // Endpoint for insights (last 30 days)
      const endpoint = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/act_${adAccountId}/insights`;
      
      const params = new URLSearchParams({
        access_token: accessToken,
        date_preset: 'last_30d',
        level: 'campaign',
        fields: 'campaign_id,campaign_name,spend,clicks,impressions,ctr,cpc',
      });

      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API Error: ${error.error?.message || 'Unknown'}`);
      }

      const data = await response.json();
      
      return data.data.map((row: any) => ({
        id: row.campaign_id,
        name: row.campaign_name,
        spend: parseFloat(row.spend || '0'),
        clicks: parseInt(row.clicks || '0'),
        impressions: parseInt(row.impressions || '0'),
        ctr: parseFloat(row.ctr || '0'),
        cpc: parseFloat(row.cpc || '0'),
      }));

    } catch (error: any) {
      console.error('[Meta Direct] Fetch failed:', error.message);
      throw error;
    }
  }
};

export default metaAdsDirect;
