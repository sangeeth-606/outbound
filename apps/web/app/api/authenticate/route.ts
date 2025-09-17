import { DeepgramError, createClient } from "@deepgram/sdk";
import { NextResponse, type NextRequest } from "next/server";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  // For live transcription, we need to use the API key directly
  // since this key doesn't have token generation permissions
  return NextResponse.json({
    access_token: process.env.DEEPGRAM_API_KEY ?? "",
  });
}
