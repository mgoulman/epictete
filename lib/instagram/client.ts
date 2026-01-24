/**
 * Instagram Graph API Client
 * TypeScript client for Instagram Business Account management
 * Complements Meta Ads MCP with organic content capabilities
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface InstagramConfig {
  accessToken: string;
  instagramAccountId?: string;
  pageId?: string;
}

export interface MediaContainer {
  id: string;
}

export interface MediaItem {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: MediaInsight[];
}

export interface MediaInsight {
  name: string;
  period: string;
  values: { value: number }[];
  title: string;
  description: string;
}

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  website?: string;
}

export interface StoryItem {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url?: string;
  timestamp: string;
}

export interface AccountInsight {
  name: string;
  period: string;
  values: { value: number; end_time?: string }[];
  title: string;
  description: string;
}

export class InstagramClient {
  private accessToken: string;
  private instagramAccountId?: string;
  private pageId?: string;

  constructor(config: InstagramConfig) {
    this.accessToken = config.accessToken || process.env.META_ACCESS_TOKEN || '';
    this.instagramAccountId = config.instagramAccountId;
    this.pageId = config.pageId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${GRAPH_API_BASE}${endpoint}`;
    
    const separator = url.includes('?') ? '&' : '?';
    const urlWithToken = `${url}${separator}access_token=${this.accessToken}`;

    const response = await fetch(urlWithToken, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Account Discovery
  async getConnectedAccounts(): Promise<{ data: { id: string; instagram_business_account?: { id: string } }[] }> {
    return this.request('/me/accounts?fields=id,name,instagram_business_account{id,username}');
  }

  async getInstagramAccountId(pageId: string): Promise<string | null> {
    const result = await this.request<{ instagram_business_account?: { id: string } }>(
      `/${pageId}?fields=instagram_business_account`
    );
    return result.instagram_business_account?.id || null;
  }

  // Profile Management
  async getProfile(accountId?: string): Promise<InstagramProfile> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(
      `/${id}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`
    );
  }

  // Media Management
  async getMedia(
    accountId?: string,
    limit: number = 25,
    fields: string = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count'
  ): Promise<{ data: MediaItem[]; paging?: { cursors: { after: string } } }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/media?fields=${fields}&limit=${limit}`);
  }

  async getMediaDetails(mediaId: string): Promise<MediaItem> {
    return this.request(
      `/${mediaId}?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count`
    );
  }

  async getMediaInsights(
    mediaId: string,
    metrics: string[] = ['engagement', 'impressions', 'reach', 'saved']
  ): Promise<{ data: MediaInsight[] }> {
    return this.request(`/${mediaId}/insights?metric=${metrics.join(',')}`);
  }

  // Stories
  async getStories(accountId?: string): Promise<{ data: StoryItem[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/stories?fields=id,media_type,media_url,timestamp`);
  }

  // Publishing - Image Post
  async createImageContainer(
    imageUrl: string,
    caption?: string,
    accountId?: string
  ): Promise<MediaContainer> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    const params = new URLSearchParams({
      image_url: imageUrl,
      ...(caption && { caption }),
    });

    return this.request(`/${id}/media?${params.toString()}`, { method: 'POST' });
  }

  async createVideoContainer(
    videoUrl: string,
    caption?: string,
    mediaType: 'VIDEO' | 'REELS' = 'VIDEO',
    accountId?: string
  ): Promise<MediaContainer> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    const params = new URLSearchParams({
      video_url: videoUrl,
      media_type: mediaType,
      ...(caption && { caption }),
    });

    return this.request(`/${id}/media?${params.toString()}`, { method: 'POST' });
  }

  async createCarouselContainer(
    children: string[], // Array of container IDs
    caption?: string,
    accountId?: string
  ): Promise<MediaContainer> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    const params = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: children.join(','),
      ...(caption && { caption }),
    });

    return this.request(`/${id}/media?${params.toString()}`, { method: 'POST' });
  }

  async publishMedia(containerId: string, accountId?: string): Promise<{ id: string }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/media_publish?creation_id=${containerId}`, { method: 'POST' });
  }

  async checkContainerStatus(containerId: string): Promise<{ status_code: string; status?: string }> {
    return this.request(`/${containerId}?fields=status_code,status`);
  }

  // Account Insights
  async getAccountInsights(
    metrics: string[] = ['impressions', 'reach', 'profile_views', 'follower_count'],
    period: 'day' | 'week' | 'days_28' | 'lifetime' = 'day',
    accountId?: string
  ): Promise<{ data: AccountInsight[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/insights?metric=${metrics.join(',')}&period=${period}`);
  }

  async getAudienceInsights(
    metrics: string[] = ['audience_city', 'audience_country', 'audience_gender_age'],
    accountId?: string
  ): Promise<{ data: AccountInsight[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/insights?metric=${metrics.join(',')}&period=lifetime`);
  }

  // Hashtag Search
  async searchHashtag(hashtag: string, accountId?: string): Promise<{ data: { id: string }[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/ig_hashtag_search?user_id=${id}&q=${encodeURIComponent(hashtag)}`);
  }

  async getHashtagTopMedia(hashtagId: string, accountId?: string): Promise<{ data: MediaItem[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(
      `/${hashtagId}/top_media?user_id=${id}&fields=id,media_type,permalink,caption,like_count,comments_count`
    );
  }

  async getHashtagRecentMedia(hashtagId: string, accountId?: string): Promise<{ data: MediaItem[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(
      `/${hashtagId}/recent_media?user_id=${id}&fields=id,media_type,permalink,caption,like_count,comments_count`
    );
  }

  // Comments Management
  async getMediaComments(mediaId: string): Promise<{ data: { id: string; text: string; username: string; timestamp: string }[] }> {
    return this.request(`/${mediaId}/comments?fields=id,text,username,timestamp`);
  }

  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    return this.request(`/${commentId}/replies?message=${encodeURIComponent(message)}`, { method: 'POST' });
  }

  async hideComment(commentId: string, hide: boolean = true): Promise<{ success: boolean }> {
    return this.request(`/${commentId}?hide=${hide}`, { method: 'POST' });
  }

  // Mentions
  async getMentions(accountId?: string): Promise<{ data: MediaItem[] }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(`/${id}/tags?fields=id,media_type,permalink,caption,timestamp`);
  }

  // Business Discovery (Competitor Analysis)
  async discoverBusiness(
    username: string,
    accountId?: string
  ): Promise<InstagramProfile & { media?: { data: MediaItem[] } }> {
    const id = accountId || this.instagramAccountId;
    if (!id) throw new Error('Instagram account ID is required');

    return this.request(
      `/${id}?fields=business_discovery.username(${username}){id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media{id,media_type,permalink,caption,like_count,comments_count,timestamp}}`
    );
  }
}

// Export singleton with default config
export const instagramClient = new InstagramClient({
  accessToken: process.env.META_ACCESS_TOKEN || '',
});
