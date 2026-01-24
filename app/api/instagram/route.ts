import { NextRequest, NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

const getClient = (accessToken?: string) => {
  return new InstagramClient({
    accessToken: accessToken || process.env.META_ACCESS_TOKEN || '',
  });
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const accountId = searchParams.get('account_id');
  const accessToken = request.headers.get('x-access-token') || undefined;

  const client = getClient(accessToken);

  try {
    switch (action) {
      case 'accounts':
        const accounts = await client.getConnectedAccounts();
        return NextResponse.json(accounts);

      case 'profile':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const profile = await client.getProfile(accountId);
        return NextResponse.json(profile);

      case 'media':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const limit = parseInt(searchParams.get('limit') || '25');
        const media = await client.getMedia(accountId, limit);
        return NextResponse.json(media);

      case 'stories':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const stories = await client.getStories(accountId);
        return NextResponse.json(stories);

      case 'insights':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const period = (searchParams.get('period') as 'day' | 'week' | 'days_28') || 'day';
        const insights = await client.getAccountInsights(
          ['impressions', 'reach', 'profile_views', 'follower_count'],
          period,
          accountId
        );
        return NextResponse.json(insights);

      case 'audience':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const audience = await client.getAudienceInsights(
          ['audience_city', 'audience_country', 'audience_gender_age'],
          accountId
        );
        return NextResponse.json(audience);

      case 'mentions':
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const mentions = await client.getMentions(accountId);
        return NextResponse.json(mentions);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: accounts, profile, media, stories, insights, audience, mentions' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Instagram API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get('x-access-token') || undefined;
  const client = getClient(accessToken);

  try {
    const body = await request.json();
    const { action, account_id, ...params } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    switch (action) {
      case 'publish_image':
        const { image_url, caption } = params;
        if (!image_url) {
          return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
        }
        const imageContainer = await client.createImageContainer(image_url, caption, account_id);
        const imageResult = await client.publishMedia(imageContainer.id, account_id);
        return NextResponse.json(imageResult);

      case 'publish_video':
        const { video_url, caption: videoCaption, media_type } = params;
        if (!video_url) {
          return NextResponse.json({ error: 'video_url is required' }, { status: 400 });
        }
        const videoContainer = await client.createVideoContainer(
          video_url,
          videoCaption,
          media_type || 'VIDEO',
          account_id
        );
        // Video processing takes time, return container ID for status checking
        return NextResponse.json({ container_id: videoContainer.id, status: 'processing' });

      case 'publish_carousel':
        const { children, caption: carouselCaption } = params;
        if (!children || !Array.isArray(children) || children.length === 0) {
          return NextResponse.json({ error: 'children array is required' }, { status: 400 });
        }
        const carouselContainer = await client.createCarouselContainer(children, carouselCaption, account_id);
        const carouselResult = await client.publishMedia(carouselContainer.id, account_id);
        return NextResponse.json(carouselResult);

      case 'check_container':
        const { container_id } = params;
        if (!container_id) {
          return NextResponse.json({ error: 'container_id is required' }, { status: 400 });
        }
        const status = await client.checkContainerStatus(container_id);
        return NextResponse.json(status);

      case 'publish_container':
        const { container_id: containerId } = params;
        if (!containerId) {
          return NextResponse.json({ error: 'container_id is required' }, { status: 400 });
        }
        const publishResult = await client.publishMedia(containerId, account_id);
        return NextResponse.json(publishResult);

      case 'discover_business':
        const { username } = params;
        if (!username) {
          return NextResponse.json({ error: 'username is required' }, { status: 400 });
        }
        const businessProfile = await client.discoverBusiness(username, account_id);
        return NextResponse.json(businessProfile);

      case 'search_hashtag':
        const { hashtag } = params;
        if (!hashtag) {
          return NextResponse.json({ error: 'hashtag is required' }, { status: 400 });
        }
        const hashtagResult = await client.searchHashtag(hashtag, account_id);
        return NextResponse.json(hashtagResult);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: publish_image, publish_video, publish_carousel, check_container, publish_container, discover_business, search_hashtag' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Instagram API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
