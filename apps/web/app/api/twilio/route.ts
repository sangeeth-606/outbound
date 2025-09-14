import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomName = url.searchParams.get('room_name');
    
    if (!roomName) {
      return NextResponse.json(
        { error: 'room_name parameter is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/twilio/voice?room_name=${roomName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error with Twilio webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process Twilio webhook' },
      { status: 500 }
    );
  }
}
