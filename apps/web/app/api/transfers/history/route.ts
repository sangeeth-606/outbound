import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    const limit = searchParams.get('limit') || '20';

    const response = await fetch(`${BACKEND_URL}/api/transfers/history?agent_id=${agent_id}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transfer history',
        transfers: [],
        total: 0
      },
      { status: 500 }
    );
  }
}