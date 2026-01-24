# MCP Server - Meta Ads & Instagram

Hosted MCP (Model Context Protocol) server for Claude Desktop and other MCP clients.

## Overview

This MCP server provides tools for managing Meta Ads campaigns and Instagram content directly from AI assistants like Claude Desktop.

**Endpoint:** `https://your-domain.com/api/mcp`  
**Transport:** Streamable HTTP  
**Authentication:** Bearer token

## Setup

### 1. Configure Environment

```bash
# .env.local

# Meta API Access Token (Required)
META_ACCESS_TOKEN=your_meta_access_token_here

# MCP API Key (Required for secure access)
# Generate with: openssl rand -hex 32
MCP_API_KEY=your_secure_api_key_here
```

### 2. Deploy Your App

Deploy your Next.js app to Vercel (or any hosting platform):

```bash
vercel --prod
```

### 3. Test the Endpoint

```bash
# Check server info
curl https://your-domain.com/api/mcp?action=info

# List available tools
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "epictete-meta-ads": {
      "url": "https://your-domain.com/api/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

Replace:
- `your-domain.com` with your actual domain
- `YOUR_MCP_API_KEY` with your MCP API key

## Available Tools

### Meta Ads Tools

| Tool | Description |
|------|-------------|
| `get_ad_accounts` | List accessible ad accounts |
| `get_account_info` | Get account details |
| `get_account_pages` | Get pages for an account |
| `get_campaigns` | List campaigns with filtering |
| `get_campaign_details` | Get campaign details |
| `create_campaign` | Create new campaign |
| `update_campaign` | Update campaign |
| `get_adsets` | List ad sets |
| `get_adset_details` | Get ad set details |
| `get_ads` | List ads |
| `get_ad_details` | Get ad details |
| `get_ad_creatives` | Get creative details |
| `get_insights` | Get performance analytics |
| `search_interests` | Search targeting interests |
| `search_behaviors` | Get behavior options |
| `search_demographics` | Get demographic options |
| `search_geo_locations` | Search locations |
| `estimate_audience_size` | Estimate audience |

### Instagram Tools

| Tool | Description |
|------|-------------|
| `instagram_get_profile` | Get profile info |
| `instagram_get_media` | Get recent posts |
| `instagram_get_stories` | Get active stories |
| `instagram_get_insights` | Get account insights |
| `instagram_get_audience` | Get audience demographics |
| `instagram_publish_image` | Publish image post |
| `instagram_discover_business` | Competitor analysis |
| `instagram_search_hashtag` | Search hashtag |
| `instagram_get_mentions` | Get tagged posts |

## Usage Examples with Claude

Once configured, you can ask Claude:

> "Show me the performance of my Meta Ads campaigns from the last 30 days"

> "Create a new traffic campaign called 'Summer 2025' with a $50/day budget"

> "What are the best interests to target for a restaurant in Morocco?"

> "Get my Instagram follower growth for the past week"

> "Analyze the competitor @restaurant_xyz on Instagram"

## Security

- **Never share your MCP_API_KEY** - treat it like a password
- The API key protects your Meta Ads account from unauthorized access
- Use HTTPS in production (automatic with Vercel)
- Rotate your API key periodically

## Protocol Reference

### Initialize

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1,
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "your-client", "version": "1.0.0"}
  }
}
```

### List Tools

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

### Call Tool

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 3,
  "params": {
    "name": "get_campaigns",
    "arguments": {
      "account_id": "act_123456789",
      "limit": 10
    }
  }
}
```

## Troubleshooting

### "Authorization required" error
- Ensure `Authorization: Bearer YOUR_KEY` header is set
- Check that MCP_API_KEY is configured in your environment

### "Server not configured" error
- Set META_ACCESS_TOKEN in your environment variables
- Redeploy after adding environment variables

### Tools not appearing in Claude
- Restart Claude Desktop after config changes
- Verify the URL is accessible (test with curl)
- Check Claude Desktop logs for connection errors

## Development

To test locally:

```bash
# Start dev server
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```
