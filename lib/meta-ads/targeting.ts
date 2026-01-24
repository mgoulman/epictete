/**
 * Meta Ads Targeting Research
 */

import { makeAPIRequest, normalizeAccountId } from './api';

export interface InterestResult {
  id: string;
  name: string;
  audience_size?: number;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  description?: string;
  topic?: string;
}

export interface BehaviorResult {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  description?: string;
}

export interface DemographicResult {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  description?: string;
}

export interface GeoLocationResult {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  country_name?: string;
  region?: string;
  primary_city?: string;
  supports_region?: boolean;
  supports_city?: boolean;
}

export interface AudienceEstimate {
  users_lower_bound?: number;
  users_upper_bound?: number;
  estimate_ready: boolean;
}

// Search Interests
export async function searchInterests(
  accessToken: string,
  query: string,
  limit: number = 25
): Promise<{ data: InterestResult[] }> {
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adinterest',
      q: query,
      limit,
    },
  });
}

// Get Interest Suggestions based on existing interests
export async function getInterestSuggestions(
  accessToken: string,
  interestList: string[],
  limit: number = 25
): Promise<{ data: InterestResult[] }> {
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adinterestsuggestion',
      interest_list: interestList,
      limit,
    },
  });
}

// Search Behaviors
export async function searchBehaviors(
  accessToken: string,
  limit: number = 50
): Promise<{ data: BehaviorResult[] }> {
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adTargetingCategory',
      class: 'behaviors',
      limit,
    },
  });
}

// Search Demographics
export async function searchDemographics(
  accessToken: string,
  demographicClass: string = 'demographics',
  limit: number = 50
): Promise<{ data: DemographicResult[] }> {
  // Valid classes: demographics, life_events, industries, income, family_statuses, user_device, user_os
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adTargetingCategory',
      class: demographicClass,
      limit,
    },
  });
}

// Search Geo Locations
export async function searchGeoLocations(
  accessToken: string,
  query: string,
  locationTypes?: string[],
  limit: number = 25
): Promise<{ data: GeoLocationResult[] }> {
  const params: Record<string, unknown> = {
    type: 'adgeolocation',
    q: query,
    limit,
  };

  if (locationTypes && locationTypes.length > 0) {
    params.location_types = locationTypes;
  }

  return makeAPIRequest('search', accessToken, { params });
}

// Estimate Audience Size
export interface EstimateAudienceOptions {
  targeting: Record<string, unknown>;
  optimizationGoal?: string;
}

export async function estimateAudienceSize(
  accessToken: string,
  accountId: string,
  options: EstimateAudienceOptions
): Promise<{ data: AudienceEstimate[] }> {
  const normalizedId = normalizeAccountId(accountId);
  const { targeting, optimizationGoal = 'REACH' } = options;

  return makeAPIRequest(`${normalizedId}/delivery_estimate`, accessToken, {
    params: {
      targeting_spec: targeting,
      optimization_goal: optimizationGoal,
    },
  });
}

// Validate Interest IDs
export async function validateInterests(
  accessToken: string,
  interestIds: string[]
): Promise<{ data: InterestResult[] }> {
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adinterestvalid',
      interest_list: interestIds,
    },
  });
}

// Get Locale Targeting Options
export async function searchLocales(
  accessToken: string,
  query: string,
  limit: number = 25
): Promise<{ data: { key: string; name: string }[] }> {
  return makeAPIRequest('search', accessToken, {
    params: {
      type: 'adlocale',
      q: query,
      limit,
    },
  });
}
