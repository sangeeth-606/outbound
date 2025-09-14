# Demo Script for Warm Transfer Application

## Pre-Demo Setup

1. **Start the Backend Server**
   ```bash
   cd backend
   source venv/bin/activate  # or activate your Python environment
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend Server**
   ```bash
   cd apps/web
   npm run dev
   ```

3. **Open Multiple Browser Tabs**
   - Tab 1: http://localhost:3000 (for Caller)
   - Tab 2: http://localhost:3000 (for Agent A)
   - Tab 3: http://localhost:3000 (for Agent B)

## Demo Flow

### Step 1: Role Selection (2 minutes)
- **Tab 1**: Click "Join as Caller" → Navigate to caller interface
- **Tab 2**: Click "Agent A" → Navigate to Agent A dashboard
- **Tab 3**: Click "Agent B" → Navigate to Agent B dashboard

### Step 2: Initial Connection (3 minutes)
- **Agent A**: Click "Start Taking Calls" → Wait for connection confirmation
- **Agent B**: Click "Connect to Transfer System" → Wait for connection confirmation
- **Caller**: Click "Start Call" → Wait for connection to Agent A

### Step 3: Call in Progress (2 minutes)
- **Caller**: Demonstrate video/audio controls (mute/unmute, camera on/off)
- **Agent A**: Show participant list, demonstrate controls
- **Explain**: "This simulates a customer calling for support"

### Step 4: Warm Transfer Initiation (3 minutes)
- **Agent A**: Click "Initiate Warm Transfer"
- **Show**: AI-generated summary appears
- **Explain**: "The system automatically generates a summary of the conversation using OpenAI GPT"
- **Show**: Agent A is now connected to transfer room with Agent B

### Step 5: Context Sharing (2 minutes)
- **Agent A**: Read the AI-generated summary aloud
- **Explain**: "Agent A is now providing context to Agent B about the customer's issue"
- **Show**: Both agents can see each other in the transfer room

### Step 6: Transfer Completion (2 minutes)
- **Agent A**: Click "Complete Transfer"
- **Show**: Agent A disconnects from original call
- **Explain**: "The customer is now seamlessly connected to Agent B with full context"
- **Agent B**: Show that they now have the customer and the context

### Step 7: Post-Transfer (1 minute)
- **Agent B**: Demonstrate continuing the call with context
- **Explain**: "Agent B can now help the customer with full knowledge of the previous conversation"

## Key Points to Highlight

### Technical Features
1. **Real-time Communication**: LiveKit provides low-latency audio/video
2. **AI Integration**: OpenAI generates contextual summaries automatically
3. **Phone Integration**: Twilio enables transfers to real phone numbers
4. **Seamless Handoff**: No interruption to customer experience

### Business Value
1. **Improved Customer Experience**: No need to repeat information
2. **Agent Efficiency**: Context is automatically preserved
3. **Scalability**: Can handle multiple concurrent transfers
4. **Flexibility**: Works with web agents and phone numbers

### Architecture Benefits
1. **Modular Design**: Backend and frontend are separate
2. **API-First**: Easy to integrate with existing systems
3. **Real-time**: WebRTC for optimal performance
4. **Extensible**: Easy to add new features and integrations

## Troubleshooting During Demo

### If LiveKit Connection Fails
- Check that LiveKit server is running
- Verify API keys in environment variables
- Check network connectivity

### If AI Summary Doesn't Generate
- Verify OpenAI API key is valid
- Check API quota and billing
- Show fallback summary if available

### If Twilio Integration Fails
- Explain that phone integration is optional
- Focus on web-to-web transfer functionality
- Mention that Twilio requires real phone numbers

## Demo Variations

### Quick Demo (5 minutes)
- Focus on Steps 1, 2, 4, and 6
- Skip detailed explanations
- Emphasize the seamless transfer experience

### Technical Demo (15 minutes)
- Include all steps
- Show API documentation at http://localhost:8000/docs
- Explain the architecture and code structure

### Business Demo (10 minutes)
- Focus on business value and use cases
- Show how it improves customer experience
- Discuss integration possibilities

## Post-Demo Q&A

### Common Questions
1. **"How does this scale?"**
   - LiveKit supports thousands of concurrent rooms
   - Backend can be horizontally scaled
   - Database can be added for persistence

2. **"Can this integrate with our existing system?"**
   - Yes, via REST APIs
   - Can be embedded in existing applications
   - Supports custom authentication

3. **"What about security?"**
   - All communications are encrypted
   - Token-based authentication
   - Can integrate with enterprise SSO

4. **"How much does this cost?"**
   - LiveKit: Pay-per-minute pricing
   - OpenAI: Pay-per-token
   - Twilio: Pay-per-minute for phone calls
   - Infrastructure: Standard cloud costs

### Next Steps
1. **Pilot Program**: Start with a small team
2. **Integration**: Connect to existing CRM/support systems
3. **Customization**: Adapt UI and workflows to specific needs
4. **Scaling**: Deploy to production with monitoring

---

**Remember**: The goal is to demonstrate the seamless warm transfer experience and the technical capabilities that make it possible.
