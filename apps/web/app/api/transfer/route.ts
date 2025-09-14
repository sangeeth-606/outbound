import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    let endpoint = '';
    if (action === 'initiate') {
      endpoint = '/api/transfer/initiate';
    } else if (action === 'complete') {
      endpoint = '/api/transfer/complete';
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "initiate" or "complete"' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error with transfer:', error);
    return NextResponse.json(
      { error: 'Failed to process transfer' },
      { status: 500 }
    );
  }
}
