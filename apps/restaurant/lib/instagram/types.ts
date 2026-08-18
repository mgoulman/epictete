/**
 * Instagram Graph API Types
 * Additional type definitions for Instagram functionality
 */

// Content Types
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';

export interface ContentPost {
  id?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  caption?: string;
  hashtags?: string[];
  location?: string;
  scheduledTime?: Date;
  children?: ContentPost[]; // For carousels
}

// Scheduling Types
export interface ScheduledPost extends ContentPost {
  scheduledTime: Date;
  status: 'pending' | 'published' | 'failed';
  containerId?: string;
  publishedId?: string;
  error?: string;
}

// Analytics Types
export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
}

export interface ProfileMetrics {
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profileViews: number;
  websiteClicks: number;
  emailClicks: number;
}

export interface AudienceDemographics {
  cities: { name: string; count: number }[];
  countries: { code: string; count: number }[];
  genderAge: { gender: string; age: string; count: number }[];
}

export interface ContentPerformance {
  postId: string;
  timestamp: Date;
  mediaType: MediaType;
  caption?: string;
  metrics: EngagementMetrics;
  engagementRate: number;
}

// Competitor Analysis Types
export interface CompetitorProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  recentPosts: ContentPerformance[];
  averageEngagementRate: number;
}

// Hashtag Types
export interface HashtagInfo {
  id: string;
  name: string;
  mediaCount?: number;
}

export interface HashtagPerformance {
  hashtag: string;
  usageCount: number;
  averageEngagement: number;
  topPosts: ContentPerformance[];
}

// Best Posting Time Analysis
export interface PostingTimeAnalysis {
  dayOfWeek: number;
  hour: number;
  averageEngagement: number;
  postCount: number;
}

// Content Calendar
export interface ContentCalendarItem {
  id: string;
  date: Date;
  content: ContentPost;
  status: 'draft' | 'scheduled' | 'published';
  performance?: ContentPerformance;
}

// API Response Wrappers
export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

// Webhook Types (for future real-time updates)
export interface WebhookEvent {
  object: 'instagram';
  entry: {
    id: string;
    time: number;
    changes?: {
      field: string;
      value: unknown;
    }[];
    messaging?: {
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text: string };
    }[];
  }[];
}

// Content Approval Workflow
export interface ContentApproval {
  id: string;
  content: ContentPost;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  comments?: string;
}
