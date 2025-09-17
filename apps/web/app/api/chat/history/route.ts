import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_name, messages } = body;
    
    if (!room_name || !messages) {
      return NextResponse.json(
        { success: false, error: 'Missing room_name or messages' },
        { status: 400 }
      );
    }

    // Format messages for AI summarization
    const formattedMessages = messages.map((msg: any) => ({
      sender: msg.sender,
      sender_identity: msg.senderIdentity,
      content: msg.content,
      timestamp: msg.timestamp,
      is_local: msg.isLocal,
      type: msg.type || 'message'
    }));

    const conversationText = formattedMessages
      .filter((msg: any) => msg.type === 'message') // Only include regular messages, not summaries
      .map((msg: any) => `${msg.sender}: ${msg.content}`)
      .join('\n');

    // Send to backend for processing and summarization
    const response = await fetch(`${BACKEND_URL}/api/chat/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_name,
        conversation_text: conversationText,
        message_count: formattedMessages.length,
        raw_messages: formattedMessages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend chat history error:', errorText);
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: 'Failed to generate conversation summary. Transfer will proceed with basic context.'
      },
      { status: 500 }
    );
  }
}
