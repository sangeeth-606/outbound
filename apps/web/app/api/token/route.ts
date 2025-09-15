import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Do not cache endpoint result
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  const callerType = req.nextUrl.searchParams.get('callerType') || 'investor';
  const email = req.nextUrl.searchParams.get('email');

  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  try {
    // For customers, use the backend queue system
    if (username === 'customer' && email) {
      const response = await fetch(`${BACKEND_URL}/api/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: room,
          participant_identity: username,
          caller_type: callerType,
          email: email
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend room/create response:', data);
      
      // Ensure consistent response structure (always expose `token`)
      return NextResponse.json({
        token: data.access_token || data.token || '',
        room_name: data.room_name || room,
        queue_status: data.queue_status || 'connected',
        queue_position: data.queue_position || null,
        estimated_wait_time: data.estimated_wait_time || null,
        caller_context: data.caller_context || null
      }, { headers: { "Cache-Control": "no-store" } });
    } else {
      // For agents, use direct token generation (no queue)
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const wsUrl = process.env.LIVEKIT_URL;

      if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }

      const { AccessToken } = await import('livekit-server-sdk');
      const at = new AccessToken(apiKey, apiSecret, { identity: username });
      at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

      return NextResponse.json(
        {
          token: await at.toJwt(),
          queue_status: "connected" // Agents always connect directly
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    console.error('Error getting token:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
}
