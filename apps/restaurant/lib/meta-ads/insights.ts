/**
 * Meta Ads Insights & Analytics
 */

import { makeAPIRequest } from './api';

export type TimeRange =
  | 'today'
  | 'yesterday'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'last_3d'
  | 'last_7d'
  | 'last_14d'
  | 'last_28d'
  | 'last_30d'
  | 'last_90d'
  | 'maximum'
  | 'data_maximum'
  | { since: string; until: string };

export type InsightLevel = 'account' | 'campaign' | 'adset' | 'ad';

export type Breakdown =
  | 'age'
  | 'gender'
  | 'country'
  | 'region'
  | 'dma'
  | 'device_platform'
  | 'platform_position'
  | 'publisher_platform'
  | 'impression_device'
  | 'ad_format_asset'
  | 'hourly_stats_aggregated_by_advertiser_time_zone';

export interface InsightAction {
  action_type: string;
  value: string;
}

export interface Insight {
  date_start: string;
  date_stop: string;
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: InsightAction[];
  conversions?: InsightAction[];
  cost_per_action_type?: InsightAction[];
  // Breakdown fields
  age?: string;
  gender?: string;
  country?: string;
  device_platform?: string;
}

const INSIGHT_FIELDS = 'impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,actions,conversions,cost_per_action_type';

export interface GetInsightsOptions {
  timeRange?: TimeRange;
  level?: InsightLevel;
  breakdown?: Breakdown;
  limit?: number;
  after?: string;
  actionAttributionWindows?: string[];
}

export async function getInsights(
  accessToken: string,
  objectId: string,
  options: GetInsightsOptions = {}
): Promise<{ data: Insight[]; paging?: { cursors: { after: string } } }> {
  const {
    timeRange = 'last_30d',
    level = 'campaign',
    breakdown,
    limit = 25,
    after,
    actionAttributionWindows,
  } = options;

  const params: Record<string, unknown> = {
    fields: INSIGHT_FIELDS,
    level,
    limit,
  };

  // Handle time range
  if (typeof timeRange === 'string') {
    params.date_preset = timeRange;
  } else {
    params.time_range = timeRange;
  }

  if (breakdown) {
    params.breakdowns = breakdown;
  }

  if (after) {
    params.after = after;
  }

  if (actionAttributionWindows) {
    params.action_attribution_windows = actionAttributionWindows;
  }

  return makeAPIRequest(`${objectId}/insights`, accessToken, { params });
}

// Convenience function for account-level insights
export async function getAccountInsights(
  accessToken: string,
  accountId: string,
  options: Omit<GetInsightsOptions, 'level'> = {}
): Promise<{ data: Insight[] }> {
  const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  return getInsights(accessToken, normalizedId, { ...options, level: 'account' });
}

// Convenience function for campaign-level insights
export async function getCampaignInsights(
  accessToken: string,
  campaignId: string,
  options: Omit<GetInsightsOptions, 'level'> = {}
): Promise<{ data: Insight[] }> {
  return getInsights(accessToken, campaignId, { ...options, level: 'campaign' });
}

// Convenience function for ad set-level insights
export async function getAdsetInsights(
  accessToken: string,
  adsetId: string,
  options: Omit<GetInsightsOptions, 'level'> = {}
): Promise<{ data: Insight[] }> {
  return getInsights(accessToken, adsetId, { ...options, level: 'adset' });
}

// Convenience function for ad-level insights
export async function getAdInsights(
  accessToken: string,
  adId: string,
  options: Omit<GetInsightsOptions, 'level'> = {}
): Promise<{ data: Insight[] }> {
  return getInsights(accessToken, adId, { ...options, level: 'ad' });
}
