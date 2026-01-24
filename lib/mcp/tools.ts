/**
 * MCP Tool Definitions and Executors
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Meta Ads imports
import * as metaAccounts from '@/lib/meta-ads/accounts';
import * as metaCampaigns from '@/lib/meta-ads/campaigns';
import * as metaAdsets from '@/lib/meta-ads/adsets';
import * as metaAds from '@/lib/meta-ads/ads';
import * as metaInsights from '@/lib/meta-ads/insights';
import * as metaTargeting from '@/lib/meta-ads/targeting';

// Instagram imports
import { InstagramClient } from '@/lib/instagram/client';

// Meta Ads Tool Definitions
export const META_ADS_TOOLS: Tool[] = [
  {
    name: 'get_ad_accounts',
    description: 'Get ad accounts accessible by the authenticated user',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of accounts to return (default: 200)' },
      },
    },
  },
  {
    name: 'get_account_info',
    description: 'Get detailed information about a specific ad account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID (format: act_XXXXXXXXX)' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_account_pages',
    description: 'Get pages associated with a Meta Ads account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_campaigns',
    description: 'Get campaigns for a Meta Ads account with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        limit: { type: 'number', description: 'Maximum campaigns to return (default: 10)' },
        status_filter: { type: 'string', description: 'Filter by status: ACTIVE, PAUSED, ARCHIVED' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_campaign_details',
    description: 'Get detailed information about a specific campaign',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Create a new campaign in a Meta Ads account. Objectives: OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        name: { type: 'string', description: 'Campaign name' },
        objective: { type: 'string', description: 'Campaign objective' },
        status: { type: 'string', description: 'Initial status (default: PAUSED)' },
        daily_budget: { type: 'number', description: 'Daily budget in cents' },
      },
      required: ['account_id', 'name', 'objective'],
    },
  },
  {
    name: 'update_campaign',
    description: 'Update an existing campaign',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID' },
        name: { type: 'string', description: 'New campaign name' },
        status: { type: 'string', description: 'New status: ACTIVE, PAUSED' },
        daily_budget: { type: 'number', description: 'New daily budget in cents' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'get_adsets',
    description: 'Get ad sets for a Meta Ads account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        campaign_id: { type: 'string', description: 'Filter by campaign ID' },
        limit: { type: 'number', description: 'Maximum ad sets to return' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_adset_details',
    description: 'Get detailed information about a specific ad set',
    inputSchema: {
      type: 'object',
      properties: {
        adset_id: { type: 'string', description: 'Ad set ID' },
      },
      required: ['adset_id'],
    },
  },
  {
    name: 'get_ads',
    description: 'Get ads for a Meta Ads account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        campaign_id: { type: 'string', description: 'Filter by campaign ID' },
        adset_id: { type: 'string', description: 'Filter by ad set ID' },
        limit: { type: 'number', description: 'Maximum ads to return' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_ad_details',
    description: 'Get detailed information about a specific ad',
    inputSchema: {
      type: 'object',
      properties: {
        ad_id: { type: 'string', description: 'Ad ID' },
      },
      required: ['ad_id'],
    },
  },
  {
    name: 'get_ad_creatives',
    description: 'Get creative details for a specific ad',
    inputSchema: {
      type: 'object',
      properties: {
        ad_id: { type: 'string', description: 'Ad ID' },
      },
      required: ['ad_id'],
    },
  },
  {
    name: 'get_insights',
    description: 'Get performance insights for a campaign, ad set, ad, or account. Time ranges: last_7d, last_14d, last_30d, last_90d, this_month, last_month',
    inputSchema: {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'Campaign, ad set, ad, or account ID' },
        time_range: { type: 'string', description: 'Time range (default: last_30d)' },
        level: { type: 'string', description: 'Aggregation level: account, campaign, adset, ad' },
        breakdown: { type: 'string', description: 'Breakdown: age, gender, country, device_platform' },
      },
      required: ['object_id'],
    },
  },
  {
    name: 'search_interests',
    description: 'Search for interest targeting options by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term (e.g., "cooking", "travel")' },
        limit: { type: 'number', description: 'Maximum results (default: 25)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_behaviors',
    description: 'Get available behavior targeting options',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum results (default: 50)' },
      },
    },
  },
  {
    name: 'search_demographics',
    description: 'Get demographic targeting options',
    inputSchema: {
      type: 'object',
      properties: {
        demographic_class: { type: 'string', description: 'Class: demographics, life_events, industries, income, family_statuses' },
        limit: { type: 'number', description: 'Maximum results (default: 50)' },
      },
    },
  },
  {
    name: 'search_geo_locations',
    description: 'Search for geographic targeting locations',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Location search term' },
        location_types: { type: 'array', items: { type: 'string' }, description: 'Types: country, region, city, zip' },
        limit: { type: 'number', description: 'Maximum results (default: 25)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'estimate_audience_size',
    description: 'Estimate audience size for targeting specifications',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        targeting: { type: 'object', description: 'Targeting specification with age_min, age_max, geo_locations, interests, etc.' },
        optimization_goal: { type: 'string', description: 'Goal: REACH, LINK_CLICKS, IMPRESSIONS, etc.' },
      },
      required: ['account_id', 'targeting'],
    },
  },
];

// Instagram Tool Definitions
export const INSTAGRAM_TOOLS: Tool[] = [
  {
    name: 'instagram_get_profile',
    description: 'Get Instagram business profile information including followers, posts count, bio',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_get_media',
    description: 'Get recent media posts from an Instagram account with engagement metrics',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        limit: { type: 'number', description: 'Maximum posts to return (default: 25)' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_get_stories',
    description: 'Get active stories from an Instagram account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_get_insights',
    description: 'Get Instagram account insights (impressions, reach, profile views, followers)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        period: { type: 'string', description: 'Period: day, week, days_28 (default: day)' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_get_audience',
    description: 'Get Instagram audience demographics (cities, countries, gender/age)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_publish_image',
    description: 'Publish an image post to Instagram',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        image_url: { type: 'string', description: 'Public URL of the image to post' },
        caption: { type: 'string', description: 'Post caption with hashtags' },
      },
      required: ['account_id', 'image_url'],
    },
  },
  {
    name: 'instagram_discover_business',
    description: 'Get public information about another Instagram business account for competitor analysis',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Your Instagram business account ID' },
        username: { type: 'string', description: 'Username to look up (without @)' },
      },
      required: ['account_id', 'username'],
    },
  },
  {
    name: 'instagram_search_hashtag',
    description: 'Search for a hashtag and get its ID for further research',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        hashtag: { type: 'string', description: 'Hashtag to search (without #)' },
      },
      required: ['account_id', 'hashtag'],
    },
  },
  {
    name: 'instagram_get_mentions',
    description: 'Get posts where the account was tagged/mentioned',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
      },
      required: ['account_id'],
    },
  },
];

// Meta Ads Tool Executor
export async function executeMetaAdsTool(
  accessToken: string,
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_ad_accounts':
      return metaAccounts.getAdAccounts(accessToken, 'me', (args?.limit as number) || 200);
    case 'get_account_info':
      return metaAccounts.getAccountInfo(accessToken, args?.account_id as string);
    case 'get_account_pages':
      return metaAccounts.getAccountPages(accessToken, args?.account_id as string);
    case 'get_campaigns':
      return metaCampaigns.getCampaigns(accessToken, args?.account_id as string, {
        limit: args?.limit as number,
        statusFilter: args?.status_filter as metaCampaigns.CampaignStatus,
      });
    case 'get_campaign_details':
      return metaCampaigns.getCampaignDetails(accessToken, args?.campaign_id as string);
    case 'create_campaign':
      return metaCampaigns.createCampaign(accessToken, args?.account_id as string, {
        name: args?.name as string,
        objective: args?.objective as metaCampaigns.CampaignObjective,
        status: (args?.status as metaCampaigns.CampaignStatus) || 'PAUSED',
        dailyBudget: args?.daily_budget as number,
      });
    case 'update_campaign':
      return metaCampaigns.updateCampaign(accessToken, args?.campaign_id as string, {
        name: args?.name as string,
        status: args?.status as metaCampaigns.CampaignStatus,
        dailyBudget: args?.daily_budget as number,
      });
    case 'get_adsets':
      return metaAdsets.getAdsets(accessToken, args?.account_id as string, {
        limit: args?.limit as number,
        campaignId: args?.campaign_id as string,
      });
    case 'get_adset_details':
      return metaAdsets.getAdsetDetails(accessToken, args?.adset_id as string);
    case 'get_ads':
      return metaAds.getAds(accessToken, args?.account_id as string, {
        limit: args?.limit as number,
        campaignId: args?.campaign_id as string,
        adsetId: args?.adset_id as string,
      });
    case 'get_ad_details':
      return metaAds.getAdDetails(accessToken, args?.ad_id as string);
    case 'get_ad_creatives':
      return metaAds.getAdCreatives(accessToken, args?.ad_id as string);
    case 'get_insights':
      return metaInsights.getInsights(accessToken, args?.object_id as string, {
        timeRange: (args?.time_range as metaInsights.TimeRange) || 'last_30d',
        level: (args?.level as metaInsights.InsightLevel) || 'campaign',
        breakdown: args?.breakdown as metaInsights.Breakdown,
      });
    case 'search_interests':
      return metaTargeting.searchInterests(accessToken, args?.query as string, args?.limit as number);
    case 'search_behaviors':
      return metaTargeting.searchBehaviors(accessToken, args?.limit as number);
    case 'search_demographics':
      return metaTargeting.searchDemographics(accessToken, args?.demographic_class as string, args?.limit as number);
    case 'search_geo_locations':
      return metaTargeting.searchGeoLocations(
        accessToken,
        args?.query as string,
        args?.location_types as string[],
        args?.limit as number
      );
    case 'estimate_audience_size':
      return metaTargeting.estimateAudienceSize(accessToken, args?.account_id as string, {
        targeting: args?.targeting as Record<string, unknown>,
        optimizationGoal: args?.optimization_goal as string,
      });
    default:
      throw new Error(`Unknown Meta Ads tool: ${name}`);
  }
}

// Instagram Tool Executor
export async function executeInstagramTool(
  accessToken: string,
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  const client = new InstagramClient({ accessToken });

  switch (name) {
    case 'instagram_get_profile':
      return client.getProfile(args?.account_id as string);
    case 'instagram_get_media':
      return client.getMedia(args?.account_id as string, (args?.limit as number) || 25);
    case 'instagram_get_stories':
      return client.getStories(args?.account_id as string);
    case 'instagram_get_insights':
      return client.getAccountInsights(
        ['impressions', 'reach', 'profile_views', 'follower_count'],
        (args?.period as 'day' | 'week' | 'days_28') || 'day',
        args?.account_id as string
      );
    case 'instagram_get_audience':
      return client.getAudienceInsights(
        ['audience_city', 'audience_country', 'audience_gender_age'],
        args?.account_id as string
      );
    case 'instagram_publish_image':
      const container = await client.createImageContainer(
        args?.image_url as string,
        args?.caption as string,
        args?.account_id as string
      );
      return client.publishMedia(container.id, args?.account_id as string);
    case 'instagram_discover_business':
      return client.discoverBusiness(args?.username as string, args?.account_id as string);
    case 'instagram_search_hashtag':
      return client.searchHashtag(args?.hashtag as string, args?.account_id as string);
    case 'instagram_get_mentions':
      return client.getMentions(args?.account_id as string);
    default:
      throw new Error(`Unknown Instagram tool: ${name}`);
  }
}
