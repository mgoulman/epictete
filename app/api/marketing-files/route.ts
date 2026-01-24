import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MARKETING_DIR = path.join(process.cwd(), "marketing");

// Allowed file paths for security (English and French versions)
const ALLOWED_PATHS = [
  // English versions
  "01-brand/BRAND_IDENTITY.md",
  "01-brand/BRAND_VOICE.md",
  "01-brand/VISUAL_GUIDELINES.md",
  "02-restaurant/RESTAURANT_PROFILE.md",
  "02-restaurant/MENU_CATALOG.md",
  "02-restaurant/STORY_ORIGIN.md",
  "03-audience/CUSTOMER_PERSONAS.md",
  "04-marketing/MARKETING_STRATEGY.md",
  "04-marketing/CONTENT_PILLARS.md",
  "04-marketing/SOCIAL_MEDIA_GUIDE.md",
  "05-operations/CONTACT_SOCIAL.md",
  "AI_CONTEXT.md",
  // French versions
  "01-brand/BRAND_IDENTITY_FR.md",
  "01-brand/BRAND_VOICE_FR.md",
  "01-brand/VISUAL_GUIDELINES_FR.md",
  "02-restaurant/RESTAURANT_PROFILE_FR.md",
  "02-restaurant/STORY_ORIGIN_FR.md",
  "03-audience/CUSTOMER_PERSONAS_FR.md",
  "04-marketing/MARKETING_STRATEGY_FR.md",
  "04-marketing/CONTENT_PILLARS_FR.md",
  "04-marketing/SOCIAL_MEDIA_GUIDE_FR.md",
  "05-operations/CONTACT_SOCIAL_FR.md",
  "AI_CONTEXT_FR.md",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Security check: only allow specific paths
    if (!ALLOWED_PATHS.includes(filePath)) {
      return NextResponse.json(
        { error: "File not allowed" },
        { status: 403 }
      );
    }

    const fullPath = path.join(MARKETING_DIR, filePath);
    
    // Extra security: ensure path is within marketing directory
    if (!fullPath.startsWith(MARKETING_DIR)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    const content = await fs.readFile(fullPath, "utf-8");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}
