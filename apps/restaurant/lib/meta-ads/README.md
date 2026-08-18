# Meta Ads & Instagram Integration

Pure TypeScript implementation for Meta Ads and Instagram Graph API - no Python dependencies required.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Application                          │
├─────────────────────────────────────────────────────────────────┤
│  /app/api/meta-ads/*     │  /app/api/instagram/*                │
│  (Ad Campaigns & Mgmt)   │  (Organic Content & Analytics)       │
├─────────────────────────────────────────────────────────────────┤
│  /lib/meta-ads/          │  /lib/instagram/                     │
│  - api.ts (core)         │  - client.ts                         │
│  - accounts.ts           │  - types.ts                          │
│  - campaigns.ts          │                                       │
│  - adsets.ts             │                                       │
│  - ads.ts                │                                       │
│  - insights.ts           │                                       │
│  - targeting.ts          │                                       │
├──────────────────────────┴──────────────────────────────────────┤
│                  Meta Graph API v22.0 (Direct)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Get Meta Access Token

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app (Business type)
3. Add "Marketing API" and "Instagram Graph API" products
4. Generate an access token with these permissions:
   - `ads_management`
   - `ads_read`
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`

### 2. Configure Environment

```bash
# .env.local
META_ACCESS_TOKEN=your_access_token_here
```

### 3. Use the API

```typescript
import { 
  getAdAccounts, 
  getCampaigns, 
  createCampaign,
  getInsights 
} from '@/lib/meta-ads';

const token = process.env.META_ACCESS_TOKEN!;

// Get accounts
const { data: accounts } = await getAdAccounts(token);

// Get campaigns
const { data: campaigns } = await getCampaigns(token, 'act_123456');

// Create campaign
const { id } = await createCampaign(token, 'act_123456', {
  name: 'Summer Campaign 2025',
  objective: 'OUTCOME_TRAFFIC',
  dailyBudget: 5000, // $50 in cents
});

// Get insights
const { data: insights } = await getInsights(token, 'act_123456', {
  timeRange: 'last_30d',
  level: 'campaign',
});
```

## API Routes

### Meta Ads

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meta-ads?action=accounts` | GET | List ad accounts |
| `/api/meta-ads?action=account&account_id=X` | GET | Get account details |
| `/api/meta-ads?action=pages` | GET | List pages |
| `/api/meta-ads?action=health` | GET | Health check |
| `/api/meta-ads/campaigns?account_id=X` | GET | List campaigns |
| `/api/meta-ads/campaigns?campaign_id=X` | GET | Campaign details |
| `/api/meta-ads/campaigns` | POST | Create campaign |
| `/api/meta-ads/campaigns` | PATCH | Update campaign |
| `/api/meta-ads/insights?object_id=X` | GET | Get insights |
| `/api/meta-ads/targeting?type=interests&query=X` | GET | Search interests |
| `/api/meta-ads/targeting?type=geo&query=X` | GET | Search locations |
| `/api/meta-ads/targeting` | POST | Estimate audience |

### Instagram

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram?action=accounts` | GET | Connected accounts |
| `/api/instagram?action=profile&account_id=X` | GET | Profile info |
| `/api/instagram?action=media&account_id=X` | GET | List posts |
| `/api/instagram?action=stories&account_id=X` | GET | Get stories |
| `/api/instagram?action=insights&account_id=X` | GET | Account insights |
| `/api/instagram` | POST | Publish content |
| `/api/instagram/media/[id]?action=details` | GET | Media details |
| `/api/instagram/media/[id]?action=insights` | GET | Media insights |

## Module Reference

### `/lib/meta-ads/api.ts`
Core API utilities: `makeAPIRequest`, `GraphAPIError`, `normalizeAccountId`

### `/lib/meta-ads/accounts.ts`
- `getAdAccounts(token, userId?, limit?)` - List ad accounts
- `getAccountInfo(token, accountId)` - Account details
- `getAccountPages(token, accountId)` - Pages for account
- `getUserPages(token)` - User's pages

### `/lib/meta-ads/campaigns.ts`
- `getCampaigns(token, accountId, options?)` - List campaigns
- `getCampaignDetails(token, campaignId)` - Campaign details
- `createCampaign(token, accountId, options)` - Create campaign
- `updateCampaign(token, campaignId, options)` - Update campaign

### `/lib/meta-ads/adsets.ts`
- `getAdsets(token, accountId, options?)` - List ad sets
- `getAdsetDetails(token, adsetId)` - Ad set details
- `createAdset(token, accountId, options)` - Create ad set
- `updateAdset(token, adsetId, options)` - Update ad set

### `/lib/meta-ads/ads.ts`
- `getAds(token, accountId, options?)` - List ads
- `getAdDetails(token, adId)` - Ad details
- `getAdCreatives(token, adId)` - Get creatives
- `createAd(token, accountId, options)` - Create ad
- `updateAd(token, adId, options)` - Update ad
- `createAdCreative(token, accountId, options)` - Create creative
- `uploadAdImage(token, accountId, options)` - Upload image

### `/lib/meta-ads/insights.ts`
- `getInsights(token, objectId, options?)` - Get insights
- `getAccountInsights(token, accountId, options?)` - Account insights
- `getCampaignInsights(token, campaignId, options?)` - Campaign insights

### `/lib/meta-ads/targeting.ts`
- `searchInterests(token, query, limit?)` - Search interests
- `getInterestSuggestions(token, interests, limit?)` - Interest suggestions
- `searchBehaviors(token, limit?)` - List behaviors
- `searchDemographics(token, class?, limit?)` - Demographics
- `searchGeoLocations(token, query, types?, limit?)` - Geo locations
- `estimateAudienceSize(token, accountId, options)` - Audience estimate

### `/lib/instagram/client.ts`
Full Instagram Graph API client for organic content management.

## Error Handling

```typescript
import { GraphAPIError } from '@/lib/meta-ads/api';

try {
  const campaigns = await getCampaigns(token, accountId);
} catch (error) {
  if (error instanceof GraphAPIError) {
    console.error('API Error:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.isAuthError()) {
      // Handle authentication error
    }
  }
}
```

## Campaign Objectives (ODAX)

Use these outcome-based objectives for new campaigns:
- `OUTCOME_AWARENESS` - Brand awareness
- `OUTCOME_TRAFFIC` - Website traffic
- `OUTCOME_ENGAGEMENT` - Post engagement
- `OUTCOME_LEADS` - Lead generation
- `OUTCOME_SALES` - Conversions/sales
- `OUTCOME_APP_PROMOTION` - App installs

## Rate Limits

Meta API has rate limits (~200 calls/user/hour). Best practices:
- Cache frequently accessed data
- Use batch requests when possible
- Implement exponential backoff for retries
