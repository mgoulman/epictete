/**
 * Meta Ads & Instagram MCP Server
 * Hosted MCP server that can be used with Claude Desktop and other MCP clients
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Meta Ads imports
import * as metaAccounts from '@/lib/meta-ads/accounts';
import * as metaCampaigns from '@/lib/meta-ads/campaigns';
import * as metaAdsets from '@/lib/meta-ads/adsets';
import * as metaAds from '@/lib/meta-ads/ads';
import * as metaInsights from '@/lib/meta-ads/insights';
import * as metaTargeting from '@/lib/meta-ads/targeting';

// Instagram imports
import { InstagramClient } from '@/lib/instagram/client';

export interface MCPServerConfig {
  accessToken: string;
  serverName?: string;
  serverVersion?: string;
}

// Tool definitions
const META_ADS_TOOLS: Tool[] = [
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
    description: 'Create a new campaign in a Meta Ads account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Meta Ads account ID' },
        name: { type: 'string', description: 'Campaign name' },
        objective: { 
          type: 'string', 
          description: 'Campaign objective: OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION' 
        },
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
        status: { type: 'string', description: 'New status' },
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
    name: 'get_insights',
    description: 'Get performance insights for a campaign, ad set, ad, or account',
    inputSchema: {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'Campaign, ad set, ad, or account ID' },
        time_range: { type: 'string', description: 'Time range: last_7d, last_30d, last_90d, etc.' },
        level: { type: 'string', description: 'Aggregation level: account, campaign, adset, ad' },
        breakdown: { type: 'string', description: 'Optional breakdown: age, gender, country, device_platform' },
      },
      required: ['object_id'],
    },
  },
  {
    name: 'search_interests',
    description: 'Search for interest targeting options',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_geo_locations',
    description: 'Search for geographic targeting locations',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Location search term' },
        location_types: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Types: country, region, city, zip' 
        },
        limit: { type: 'number', description: 'Maximum results' },
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
        targeting: { type: 'object', description: 'Targeting specification' },
        optimization_goal: { type: 'string', description: 'Optimization goal (default: REACH)' },
      },
      required: ['account_id', 'targeting'],
    },
  },
];

const INSTAGRAM_TOOLS: Tool[] = [
  {
    name: 'instagram_get_profile',
    description: 'Get Instagram business profile information',
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
    description: 'Get recent media posts from an Instagram account',
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
    name: 'instagram_get_insights',
    description: 'Get Instagram account insights',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        period: { type: 'string', description: 'Period: day, week, days_28' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'instagram_publish_image',
    description: 'Publish an image to Instagram',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        image_url: { type: 'string', description: 'Public URL of the image' },
        caption: { type: 'string', description: 'Post caption' },
      },
      required: ['account_id', 'image_url'],
    },
  },
  {
    name: 'instagram_discover_business',
    description: 'Get public information about another Instagram business account (competitor analysis)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Your Instagram business account ID' },
        username: { type: 'string', description: 'Username to look up' },
      },
      required: ['account_id', 'username'],
    },
  },
  {
    name: 'instagram_search_hashtag',
    description: 'Search for a hashtag and get its ID',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Instagram business account ID' },
        hashtag: { type: 'string', description: 'Hashtag to search (without #)' },
      },
      required: ['account_id', 'hashtag'],
    },
  },
];

export function createMCPServer(config: MCPServerConfig): Server {
  const { accessToken, serverName = 'epictete-meta-ads', serverVersion = '1.0.0' } = config;

  const server = new Server(
    { name: serverName, version: serverVersion },
    { capabilities: { tools: {} } }
  );

  const instagramClient = new InstagramClient({ accessToken });

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [...META_ADS_TOOLS, ...INSTAGRAM_TOOLS],
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        // Meta Ads - Accounts
        case 'get_ad_accounts':
          result = await metaAccounts.getAdAccounts(accessToken, 'me', args?.limit as number || 200);
          break;
        case 'get_account_info':
          result = await metaAccounts.getAccountInfo(accessToken, args?.account_id as string);
          break;
        case 'get_account_pages':
          result = await metaAccounts.getAccountPages(accessToken, args?.account_id as string);
          break;

        // Meta Ads - Campaigns
        case 'get_campaigns':
          result = await metaCampaigns.getCampaigns(accessToken, args?.account_id as string, {
            limit: args?.limit as number,
            statusFilter: args?.status_filter as metaCampaigns.CampaignStatus,
          });
          break;
        case 'get_campaign_details':
          result = await metaCampaigns.getCampaignDetails(accessToken, args?.campaign_id as string);
          break;
        case 'create_campaign':
          result = await metaCampaigns.createCampaign(accessToken, args?.account_id as string, {
            name: args?.name as string,
            objective: args?.objective as metaCampaigns.CampaignObjective,
            status: (args?.status as metaCampaigns.CampaignStatus) || 'PAUSED',
            dailyBudget: args?.daily_budget as number,
          });
          break;
        case 'update_campaign':
          result = await metaCampaigns.updateCampaign(accessToken, args?.campaign_id as string, {
            name: args?.name as string,
            status: args?.status as metaCampaigns.CampaignStatus,
            dailyBudget: args?.daily_budget as number,
          });
          break;

        // Meta Ads - Ad Sets
        case 'get_adsets':
          result = await metaAdsets.getAdsets(accessToken, args?.account_id as string, {
            limit: args?.limit as number,
            campaignId: args?.campaign_id as string,
          });
          break;
        case 'get_adset_details':
          result = await metaAdsets.getAdsetDetails(accessToken, args?.adset_id as string);
          break;

        // Meta Ads - Ads
        case 'get_ads':
          result = await metaAds.getAds(accessToken, args?.account_id as string, {
            limit: args?.limit as number,
            campaignId: args?.campaign_id as string,
            adsetId: args?.adset_id as string,
          });
          break;
        case 'get_ad_details':
          result = await metaAds.getAdDetails(accessToken, args?.ad_id as string);
          break;

        // Meta Ads - Insights
        case 'get_insights':
          result = await metaInsights.getInsights(accessToken, args?.object_id as string, {
            timeRange: (args?.time_range as metaInsights.TimeRange) || 'last_30d',
            level: (args?.level as metaInsights.InsightLevel) || 'campaign',
            breakdown: args?.breakdown as metaInsights.Breakdown,
          });
          break;

        // Meta Ads - Targeting
        case 'search_interests':
          result = await metaTargeting.searchInterests(accessToken, args?.query as string, args?.limit as number);
          break;
        case 'search_geo_locations':
          result = await metaTargeting.searchGeoLocations(
            accessToken,
            args?.query as string,
            args?.location_types as string[],
            args?.limit as number
          );
          break;
        case 'estimate_audience_size':
          result = await metaTargeting.estimateAudienceSize(accessToken, args?.account_id as string, {
            targeting: args?.targeting as Record<string, unknown>,
            optimizationGoal: args?.optimization_goal as string,
          });
          break;

        // Instagram
        case 'instagram_get_profile':
          result = await instagramClient.getProfile(args?.account_id as string);
          break;
        case 'instagram_get_media':
          result = await instagramClient.getMedia(args?.account_id as string, args?.limit as number || 25);
          break;
        case 'instagram_get_insights':
          result = await instagramClient.getAccountInsights(
            ['impressions', 'reach', 'profile_views', 'follower_count'],
            (args?.period as 'day' | 'week' | 'days_28') || 'day',
            args?.account_id as string
          );
          break;
        case 'instagram_publish_image':
          const container = await instagramClient.createImageContainer(
            args?.image_url as string,
            args?.caption as string,
            args?.account_id as string
          );
          result = await instagramClient.publishMedia(container.id, args?.account_id as string);
          break;
        case 'instagram_discover_business':
          result = await instagramClient.discoverBusiness(args?.username as string, args?.account_id as string);
          break;
        case 'instagram_search_hashtag':
          result = await instagramClient.searchHashtag(args?.hashtag as string, args?.account_id as string);
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// For stdio transport (Claude Desktop)
export async function runStdioServer(accessToken: string): Promise<void> {
  const server = createMCPServer({ accessToken });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
