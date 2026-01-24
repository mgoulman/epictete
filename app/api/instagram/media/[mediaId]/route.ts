import { NextRequest, NextResponse } from 'next/server';
import { InstagramClient } from '@/lib/instagram/client';

const getClient = (accessToken?: string) => {
  return new InstagramClient({
    accessToken: accessToken || process.env.META_ACCESS_TOKEN || '',
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'details';
  const accessToken = request.headers.get('x-access-token') || undefined;

  const client = getClient(accessToken);

  try {
    switch (action) {
      case 'details':
        const details = await client.getMediaDetails(mediaId);
        return NextResponse.json(details);

      case 'insights':
        const metrics = searchParams.get('metrics')?.split(',') || [
          'engagement',
          'impressions',
          'reach',
          'saved',
        ];
        const insights = await client.getMediaInsights(mediaId, metrics);
        return NextResponse.json(insights);

      case 'comments':
        const comments = await client.getMediaComments(mediaId);
        return NextResponse.json(comments);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: details, insights, comments' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Instagram media API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId: _mediaId } = await params; // Available for future use
  const accessToken = request.headers.get('x-access-token') || undefined;
  const client = getClient(accessToken);

  try {
    const body = await request.json();
    const { action, ...actionParams } = body;

    switch (action) {
      case 'reply_comment':
        const { comment_id, message } = actionParams;
        if (!comment_id || !message) {
          return NextResponse.json(
            { error: 'comment_id and message are required' },
            { status: 400 }
          );
        }
        const replyResult = await client.replyToComment(comment_id, message);
        return NextResponse.json(replyResult);

      case 'hide_comment':
        const { comment_id: commentToHide, hide } = actionParams;
        if (!commentToHide) {
          return NextResponse.json({ error: 'comment_id is required' }, { status: 400 });
        }
        const hideResult = await client.hideComment(commentToHide, hide !== false);
        return NextResponse.json(hideResult);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: reply_comment, hide_comment' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Instagram media API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
