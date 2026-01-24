/**
 * Meta Ads Ad & Creative Management
 */

import { makeAPIRequest, normalizeAccountId } from './api';

export type AdStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'PENDING_REVIEW' | 'DISAPPROVED';

export type CallToActionType =
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'SHOP_NOW'
  | 'BOOK_NOW'
  | 'DOWNLOAD'
  | 'GET_OFFER'
  | 'CONTACT_US'
  | 'WATCH_MORE'
  | 'ORDER_NOW'
  | 'GET_DIRECTIONS';

export interface Ad {
  id: string;
  name: string;
  adset_id: string;
  campaign_id?: string;
  status: AdStatus;
  effective_status?: string;
  created_time: string;
  updated_time: string;
  bid_amount?: number;
  creative?: { id: string };
}

export interface AdCreative {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  image_hash?: string;
  image_url?: string;
  thumbnail_url?: string;
  link_url?: string;
  call_to_action_type?: CallToActionType;
  object_story_spec?: Record<string, unknown>;
  asset_feed_spec?: Record<string, unknown>;
}

const AD_FIELDS = 'id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,bid_amount,creative{id}';
const CREATIVE_FIELDS = 'id,name,title,body,image_hash,image_url,thumbnail_url,link_url,call_to_action_type,object_story_spec,asset_feed_spec';

export interface GetAdsOptions {
  limit?: number;
  campaignId?: string;
  adsetId?: string;
}

export async function getAds(
  accessToken: string,
  accountId: string,
  options: GetAdsOptions = {}
): Promise<{ data: Ad[] }> {
  const { limit = 10, campaignId, adsetId } = options;
  const normalizedId = normalizeAccountId(accountId);

  const params: Record<string, unknown> = {
    fields: AD_FIELDS,
    limit,
  };

  const filters: { field: string; operator: string; value: string }[] = [];
  if (campaignId) {
    filters.push({ field: 'campaign_id', operator: 'EQUAL', value: campaignId });
  }
  if (adsetId) {
    filters.push({ field: 'adset_id', operator: 'EQUAL', value: adsetId });
  }
  if (filters.length > 0) {
    params.filtering = filters;
  }

  return makeAPIRequest(`${normalizedId}/ads`, accessToken, { params });
}

export async function getAdDetails(
  accessToken: string,
  adId: string
): Promise<Ad> {
  return makeAPIRequest(adId, accessToken, {
    params: { fields: AD_FIELDS },
  });
}

export async function getAdCreatives(
  accessToken: string,
  adId: string
): Promise<{ data: AdCreative[] }> {
  return makeAPIRequest(`${adId}/adcreatives`, accessToken, {
    params: { fields: CREATIVE_FIELDS },
  });
}

export async function getAdImage(
  accessToken: string,
  adId: string
): Promise<{ image_url?: string; thumbnail_url?: string }> {
  const creatives = await getAdCreatives(accessToken, adId);
  if (creatives.data && creatives.data.length > 0) {
    const creative = creatives.data[0];
    return {
      image_url: creative.image_url,
      thumbnail_url: creative.thumbnail_url,
    };
  }
  return {};
}

export interface CreateAdOptions {
  name: string;
  adsetId: string;
  creativeId: string;
  status?: AdStatus;
  bidAmount?: number;
  trackingSpecs?: Record<string, unknown>[];
}

export async function createAd(
  accessToken: string,
  accountId: string,
  options: CreateAdOptions
): Promise<{ id: string }> {
  const normalizedId = normalizeAccountId(accountId);
  const { name, adsetId, creativeId, status = 'PAUSED', bidAmount, trackingSpecs } = options;

  const params: Record<string, unknown> = {
    name,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status,
  };

  if (bidAmount !== undefined) params.bid_amount = bidAmount;
  if (trackingSpecs) params.tracking_specs = trackingSpecs;

  return makeAPIRequest(`${normalizedId}/ads`, accessToken, {
    method: 'POST',
    params,
  });
}

export interface UpdateAdOptions {
  name?: string;
  status?: AdStatus;
  bidAmount?: number;
  creativeId?: string;
  trackingSpecs?: Record<string, unknown>[];
}

export async function updateAd(
  accessToken: string,
  adId: string,
  options: UpdateAdOptions
): Promise<{ success: boolean }> {
  const params: Record<string, unknown> = {};

  if (options.name !== undefined) params.name = options.name;
  if (options.status !== undefined) params.status = options.status;
  if (options.bidAmount !== undefined) params.bid_amount = options.bidAmount;
  if (options.creativeId !== undefined) params.creative = { creative_id: options.creativeId };
  if (options.trackingSpecs !== undefined) params.tracking_specs = options.trackingSpecs;

  return makeAPIRequest(adId, accessToken, {
    method: 'POST',
    params,
  });
}

export interface CreateCreativeOptions {
  imageHash: string;
  name?: string;
  pageId?: string;
  linkUrl?: string;
  message?: string;
  headline?: string;
  headlines?: string[];
  description?: string;
  descriptions?: string[];
  callToActionType?: CallToActionType;
  leadGenFormId?: string;
  instagramActorId?: string;
  dynamicCreativeSpec?: Record<string, unknown>;
}

export async function createAdCreative(
  accessToken: string,
  accountId: string,
  options: CreateCreativeOptions
): Promise<{ id: string }> {
  const normalizedId = normalizeAccountId(accountId);
  const {
    imageHash,
    name,
    pageId,
    linkUrl,
    message,
    headline,
    headlines,
    description,
    descriptions,
    callToActionType,
    leadGenFormId,
    instagramActorId,
    dynamicCreativeSpec,
  } = options;

  const params: Record<string, unknown> = {
    image_hash: imageHash,
  };

  if (name) params.name = name;
  
  // Build object_story_spec if we have page_id
  if (pageId) {
    const objectStorySpec: Record<string, unknown> = {
      page_id: pageId,
    };

    if (linkUrl) {
      const linkData: Record<string, unknown> = {
        link: linkUrl,
        image_hash: imageHash,
      };

      if (message) linkData.message = message;
      if (headline) linkData.name = headline;
      if (description) linkData.description = description;
      if (callToActionType) {
        linkData.call_to_action = { type: callToActionType };
        if (leadGenFormId) {
          (linkData.call_to_action as Record<string, unknown>).value = { lead_gen_form_id: leadGenFormId };
        }
      }

      objectStorySpec.link_data = linkData;
    }

    params.object_story_spec = objectStorySpec;
  }

  if (instagramActorId) params.instagram_actor_id = instagramActorId;
  if (dynamicCreativeSpec) params.dynamic_creative_spec = dynamicCreativeSpec;

  // Handle multiple headlines/descriptions for dynamic creative
  if (headlines && headlines.length > 0) {
    params.asset_feed_spec = params.asset_feed_spec || {};
    (params.asset_feed_spec as Record<string, unknown>).titles = headlines.map(h => ({ text: h }));
  }
  if (descriptions && descriptions.length > 0) {
    params.asset_feed_spec = params.asset_feed_spec || {};
    (params.asset_feed_spec as Record<string, unknown>).descriptions = descriptions.map(d => ({ text: d }));
  }

  return makeAPIRequest(`${normalizedId}/adcreatives`, accessToken, {
    method: 'POST',
    params,
  });
}

export async function uploadAdImage(
  accessToken: string,
  accountId: string,
  options: { imageUrl?: string; file?: string; name?: string }
): Promise<{ images: Record<string, { hash: string; url?: string }> }> {
  const normalizedId = normalizeAccountId(accountId);
  const params: Record<string, unknown> = {};

  if (options.imageUrl) {
    params.url = options.imageUrl;
  } else if (options.file) {
    // For base64 file upload
    params.bytes = options.file.replace(/^data:image\/\w+;base64,/, '');
  }

  if (options.name) params.name = options.name;

  return makeAPIRequest(`${normalizedId}/adimages`, accessToken, {
    method: 'POST',
    params,
  });
}
