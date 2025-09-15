import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get the WebSocket upgrade headers
    const headers = new Headers();
    headers.set('Upgrade', 'websocket');
    headers.set('Connection', 'Upgrade');
    
    // Forward the WebSocket connection to the backend
    const backendWsUrl = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${backendWsUrl}/ws/notifications`;
    
    // Return a response that indicates WebSocket upgrade
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('WebSocket proxy error:', error);
    return new Response('WebSocket connection failed', { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}