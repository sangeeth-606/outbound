# LiveKit Text Stream Chat Interface Implementation

## Overview
Successfully implemented a real-time chat interface using LiveKit's text streams for peer-to-peer messaging between callers and agents during active calls.

## Implementation Details

### New Component: `LiveKitChatInterface`
- **Location**: `/apps/web/components/LiveKitChatInterface.tsx`
- **Purpose**: Real-time P2P chat using LiveKit text streams
- **Key Features**:
  - Sends messages via `room.localParticipant.sendText()` with topic 'chat'
  - Receives messages via `room.registerTextStreamHandler('chat', handler)`
  - Auto-scrolling message display
  - Sender identification (Agent vs Customer)
  - Connection status indicators
  - Responsive design matching existing UI

### Integration Points

#### Agent A Page (`/apps/web/app/agent-a/page.tsx`)
- Added LiveKit chat interface in a 4-column grid layout
- Shows alongside video conference and caller context
- Chat appears when `isConnected = true`
- Agent sees "Agent A" for their messages, "Customer" for caller messages

#### Caller Page (`/apps/web/app/caller/page.tsx`)
- Added LiveKit chat interface in a 2-column grid layout
- Shows alongside video conference
- Chat appears when connected to agent
- Caller sees "You" for their messages, "Agent A" (or Agent B) for agent messages

### Technical Implementation

#### Message Flow
```
1. User types message and presses Send
2. `room.localParticipant.sendText(message, { topic: 'chat' })`
3. LiveKit delivers to all participants in room
4. Other participants receive via `registerTextStreamHandler('chat', ...)`
5. Message displays in chat interface
```

#### Message Structure
```typescript
interface ChatMessage {
  id: string;           // Unique identifier
  content: string;      // Message text
  sender: string;       // Display name
  senderIdentity: string; // LiveKit participant identity
  timestamp: Date;      // When sent
  isLocal: boolean;     // True if sent by current user
}
```

#### Connection States
- **Disconnected**: Shows "Waiting for connection..." 
- **Connected**: Shows "Chat is ready. Send a message to start the conversation!"
- **Active**: Real-time messaging enabled

## Usage

### For Agents
1. Start taking calls or pick next customer
2. Once connected to LiveKit room, chat interface becomes active
3. Type messages to communicate with customer in real-time
4. Messages persist for duration of call session

### For Callers
1. Join queue and get connected to agent
2. Once in LiveKit room with agent, chat interface becomes active
3. Type messages to communicate with agent in real-time
4. Can use chat alongside voice/video communication

## Features

### Message Display
- **Local messages**: Blue background, right-aligned, labeled "You"
- **Remote messages**: Gray background, left-aligned, labeled with sender role
- **Timestamps**: Show time in HH:MM format
- **Auto-scroll**: Automatically scrolls to newest messages

### Connection Indicators
- **Green dot**: Connected and ready
- **Red dot**: Disconnected
- **Status text**: Shows connection state and user role

### Error Handling
- Failed send attempts show alert to user
- Connection errors logged to console
- Graceful fallback when text streams unavailable

## Technical Notes

### No Backend Changes Required
- Text streams are peer-to-peer via LiveKit
- Existing `/api/token` endpoint provides room access
- No message persistence (real-time only)

### Performance
- Messages sent in chunks automatically by LiveKit
- No size limits on individual messages (1000 char UI limit)
- Minimal memory footprint - messages cleared on disconnect

### Browser Compatibility
- Works in all modern browsers supporting WebRTC
- Mobile responsive design
- Keyboard shortcuts (Enter to send)

## Testing

### Manual Test Steps
1. Open browser tab 1: http://localhost:3000/caller
2. Open browser tab 2: http://localhost:3000/agent-a
3. In agent tab: Click "Start Taking Calls" then "Pick Next Customer"
4. In caller tab: Enter email, select type, click "Join Queue"
5. Wait for connection (both should show connected state)
6. Type messages in either chat interface
7. Verify messages appear in real-time on both sides

### Expected Behavior
- ✅ Messages send instantly via LiveKit text streams
- ✅ Sender identity correctly displayed (Agent A vs Customer)
- ✅ Timestamps show current time
- ✅ Auto-scroll keeps latest messages visible
- ✅ Connection status updates in real-time
- ✅ UI disabled when disconnected

## Future Enhancements

### Possible Additions
- Message history persistence (requires backend)
- File/image sharing capabilities
- Typing indicators
- Message delivery confirmation
- Emoji support
- Message search/filtering

### Integration Opportunities
- Link with existing AI chat system
- Add transcription integration
- Connect with transfer workflows
- Integrate with CRM systems

## Troubleshooting

### Common Issues
1. **Chat not appearing**: Check `isConnected` state and room connection
2. **Messages not sending**: Verify LiveKit room state and token validity
3. **Messages not receiving**: Check text stream handler registration
4. **Connection issues**: Verify LIVEKIT_URL environment variable

### Debug Information
- Check browser console for LiveKit connection logs
- Verify room state via `room.state` property
- Test with minimal room setup first
- Ensure proper token permissions for text streams
