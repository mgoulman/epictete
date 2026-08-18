/**
 * Meta Ads Campaign Management
 */

import { makeAPIRequest, normalizeAccountId } from './api';

export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION';

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';

export type BidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'
  | 'LOWEST_COST_WITH_BID_CAP'
  | 'COST_CAP'
  | 'LOWEST_COST_WITH_MIN_ROAS';

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  daily_budget?: string;
  lifetime_budget?: string;
  buying_type?: string;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
  bid_strategy?: BidStrategy;
  special_ad_categories?: string[];
  budget_remaining?: string;
  configured_status?: string;
}

const CAMPAIGN_FIELDS = 'id,name,objective,status,daily_budget,lifetime_budget,buying_type,start_time,stop_time,created_time,updated_time,bid_strategy';
const CAMPAIGN_DETAIL_FIELDS = `${CAMPAIGN_FIELDS},special_ad_categories,special_ad_category_country,budget_remaining,configured_status`;

export interface GetCampaignsOptions {
  limit?: number;
  statusFilter?: CampaignStatus;
  objectiveFilter?: CampaignObjective | CampaignObjective[];
  after?: string;
}

export async function getCampaigns(
  accessToken: string,
  accountId: string,
  options: GetCampaignsOptions = {}
): Promise<{ data: Campaign[]; paging?: { cursors: { after: string } } }> {
  const { limit = 10, statusFilter, objectiveFilter, after } = options;
  const normalizedId = normalizeAccountId(accountId);

  const params: Record<string, unknown> = {
    fields: CAMPAIGN_FIELDS,
    limit,
  };

  if (statusFilter) {
    params.effective_status = [statusFilter];
  }

  if (objectiveFilter) {
    const objectives = Array.isArray(objectiveFilter) ? objectiveFilter : [objectiveFilter];
    if (objectives.length > 0) {
      params.filtering = [
        {
          field: 'objective',
          operator: 'IN',
          value: objectives,
        },
      ];
    }
  }

  if (after) {
    params.after = after;
  }

  return makeAPIRequest(`${normalizedId}/campaigns`, accessToken, { params });
}

export async function getCampaignDetails(
  accessToken: string,
  campaignId: string
): Promise<Campaign> {
  return makeAPIRequest(campaignId, accessToken, {
    params: { fields: CAMPAIGN_DETAIL_FIELDS },
  });
}

export interface CreateCampaignOptions {
  name: string;
  objective: CampaignObjective;
  status?: CampaignStatus;
  specialAdCategories?: string[];
  dailyBudget?: number;
  lifetimeBudget?: number;
  buyingType?: string;
  bidStrategy?: BidStrategy;
  bidCap?: number;
  spendCap?: number;
  campaignBudgetOptimization?: boolean;
  useAdsetLevelBudgets?: boolean;
}

export async function createCampaign(
  accessToken: string,
  accountId: string,
  options: CreateCampaignOptions
): Promise<{ id: string }> {
  const normalizedId = normalizeAccountId(accountId);
  const {
    name,
    objective,
    status = 'PAUSED',
    specialAdCategories = [],
    dailyBudget,
    lifetimeBudget,
    buyingType,
    bidStrategy,
    bidCap,
    spendCap,
    campaignBudgetOptimization,
    useAdsetLevelBudgets = false,
  } = options;

  const params: Record<string, unknown> = {
    name,
    objective,
    status,
    special_ad_categories: specialAdCategories,
  };

  if (!useAdsetLevelBudgets) {
    if (dailyBudget !== undefined) {
      params.daily_budget = dailyBudget;
    } else if (lifetimeBudget === undefined) {
      params.daily_budget = 1000; // Default $10
    }

    if (lifetimeBudget !== undefined) {
      params.lifetime_budget = lifetimeBudget;
    }

    if (campaignBudgetOptimization !== undefined) {
      params.campaign_budget_optimization = campaignBudgetOptimization;
    }
  }

  if (buyingType) params.buying_type = buyingType;
  if (bidStrategy) params.bid_strategy = bidStrategy;
  if (bidCap) params.bid_cap = bidCap;
  if (spendCap) params.spend_cap = spendCap;

  return makeAPIRequest(`${normalizedId}/campaigns`, accessToken, {
    method: 'POST',
    params,
  });
}

export interface UpdateCampaignOptions {
  name?: string;
  status?: CampaignStatus;
  dailyBudget?: number | '';
  lifetimeBudget?: number | '';
  bidStrategy?: BidStrategy;
  bidCap?: number;
  spendCap?: number;
  campaignBudgetOptimization?: boolean;
  specialAdCategories?: string[];
}

export async function updateCampaign(
  accessToken: string,
  campaignId: string,
  options: UpdateCampaignOptions
): Promise<{ success: boolean }> {
  const params: Record<string, unknown> = {};

  if (options.name !== undefined) params.name = options.name;
  if (options.status !== undefined) params.status = options.status;
  if (options.dailyBudget !== undefined) params.daily_budget = options.dailyBudget;
  if (options.lifetimeBudget !== undefined) params.lifetime_budget = options.lifetimeBudget;
  if (options.bidStrategy !== undefined) params.bid_strategy = options.bidStrategy;
  if (options.bidCap !== undefined) params.bid_cap = options.bidCap;
  if (options.spendCap !== undefined) params.spend_cap = options.spendCap;
  if (options.campaignBudgetOptimization !== undefined) {
    params.campaign_budget_optimization = options.campaignBudgetOptimization;
  }
  if (options.specialAdCategories !== undefined) {
    params.special_ad_categories = options.specialAdCategories;
  }

  return makeAPIRequest(campaignId, accessToken, {
    method: 'POST',
    params,
  });
}
