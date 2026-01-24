/**
 * Meta Ads Ad Set Management
 */

import { makeAPIRequest, normalizeAccountId } from './api';

export type OptimizationGoal =
  | 'LINK_CLICKS'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'CONVERSIONS'
  | 'APP_INSTALLS'
  | 'LANDING_PAGE_VIEWS'
  | 'LEAD_GENERATION'
  | 'VIDEO_VIEWS'
  | 'ENGAGEMENT'
  | 'OFFSITE_CONVERSIONS';

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS' | 'APP_INSTALLS' | 'PAGE_LIKES';

export interface Targeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: { key: string }[];
    cities?: { key: string; radius?: number; distance_unit?: string }[];
    zips?: { key: string }[];
    location_types?: string[];
  };
  interests?: { id: string; name?: string }[];
  behaviors?: { id: string; name?: string }[];
  flexible_spec?: { interests?: { id: string }[]; behaviors?: { id: string }[] }[];
  targeting_automation?: { advantage_audience?: number };
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  effective_status?: string;
  optimization_goal: OptimizationGoal;
  billing_event: BillingEvent;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_amount?: number;
  bid_strategy?: string;
  targeting?: Targeting;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
  is_dynamic_creative?: boolean;
}

const ADSET_FIELDS = 'id,name,campaign_id,status,effective_status,optimization_goal,billing_event,daily_budget,lifetime_budget,bid_amount,bid_strategy,targeting,start_time,end_time,created_time,updated_time,is_dynamic_creative';

export interface GetAdsetsOptions {
  limit?: number;
  campaignId?: string;
}

export async function getAdsets(
  accessToken: string,
  accountId: string,
  options: GetAdsetsOptions = {}
): Promise<{ data: AdSet[] }> {
  const { limit = 10, campaignId } = options;
  const normalizedId = normalizeAccountId(accountId);

  const params: Record<string, unknown> = {
    fields: ADSET_FIELDS,
    limit,
  };

  if (campaignId) {
    params.filtering = [{ field: 'campaign_id', operator: 'EQUAL', value: campaignId }];
  }

  return makeAPIRequest(`${normalizedId}/adsets`, accessToken, { params });
}

export async function getAdsetDetails(
  accessToken: string,
  adsetId: string
): Promise<AdSet> {
  return makeAPIRequest(adsetId, accessToken, {
    params: { fields: ADSET_FIELDS },
  });
}

export interface CreateAdsetOptions {
  campaignId: string;
  name: string;
  optimizationGoal: OptimizationGoal;
  billingEvent: BillingEvent;
  status?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: Targeting;
  bidAmount?: number;
  bidStrategy?: string;
  startTime?: string;
  endTime?: string;
  dsaBeneficiary?: string;
  promotedObject?: Record<string, unknown>;
  destinationType?: string;
  isDynamicCreative?: boolean;
}

export async function createAdset(
  accessToken: string,
  accountId: string,
  options: CreateAdsetOptions
): Promise<{ id: string }> {
  const normalizedId = normalizeAccountId(accountId);
  const {
    campaignId,
    name,
    optimizationGoal,
    billingEvent,
    status = 'PAUSED',
    dailyBudget,
    lifetimeBudget,
    targeting,
    bidAmount,
    bidStrategy,
    startTime,
    endTime,
    dsaBeneficiary,
    promotedObject,
    destinationType,
    isDynamicCreative,
  } = options;

  const params: Record<string, unknown> = {
    campaign_id: campaignId,
    name,
    optimization_goal: optimizationGoal,
    billing_event: billingEvent,
    status,
  };

  if (dailyBudget !== undefined) params.daily_budget = dailyBudget;
  if (lifetimeBudget !== undefined) params.lifetime_budget = lifetimeBudget;
  if (targeting) params.targeting = targeting;
  if (bidAmount !== undefined) params.bid_amount = bidAmount;
  if (bidStrategy) params.bid_strategy = bidStrategy;
  if (startTime) params.start_time = startTime;
  if (endTime) params.end_time = endTime;
  if (dsaBeneficiary) params.dsa_beneficiary = dsaBeneficiary;
  if (promotedObject) params.promoted_object = promotedObject;
  if (destinationType) params.destination_type = destinationType;
  if (isDynamicCreative !== undefined) params.is_dynamic_creative = isDynamicCreative;

  return makeAPIRequest(`${normalizedId}/adsets`, accessToken, {
    method: 'POST',
    params,
  });
}

export interface UpdateAdsetOptions {
  name?: string;
  status?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidAmount?: number;
  bidStrategy?: string;
  targeting?: Targeting;
  optimizationGoal?: OptimizationGoal;
  frequencyControlSpecs?: { event: string; interval_days: number; max_frequency: number }[];
  isDynamicCreative?: boolean;
}

export async function updateAdset(
  accessToken: string,
  adsetId: string,
  options: UpdateAdsetOptions
): Promise<{ success: boolean }> {
  const params: Record<string, unknown> = {};

  if (options.name !== undefined) params.name = options.name;
  if (options.status !== undefined) params.status = options.status;
  if (options.dailyBudget !== undefined) params.daily_budget = options.dailyBudget;
  if (options.lifetimeBudget !== undefined) params.lifetime_budget = options.lifetimeBudget;
  if (options.bidAmount !== undefined) params.bid_amount = options.bidAmount;
  if (options.bidStrategy !== undefined) params.bid_strategy = options.bidStrategy;
  if (options.targeting !== undefined) params.targeting = options.targeting;
  if (options.optimizationGoal !== undefined) params.optimization_goal = options.optimizationGoal;
  if (options.frequencyControlSpecs !== undefined) {
    params.frequency_control_specs = options.frequencyControlSpecs;
  }
  if (options.isDynamicCreative !== undefined) params.is_dynamic_creative = options.isDynamicCreative;

  return makeAPIRequest(adsetId, accessToken, {
    method: 'POST',
    params,
  });
}
