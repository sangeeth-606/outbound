import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // This is a placeholder for WebSocket handling
  // Next.js API routes don't directly support WebSocket proxying
  // The client should connect directly to the backend WebSocket server
  
  return new Response(
    JSON.stringify({ 
      message: 'WebSocket connections should be made directly to the backend server',
      backend_ws_url: 'ws://localhost:8000/ws/notifications'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}