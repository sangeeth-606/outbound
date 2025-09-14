# Warm Transfer Demo Application

A comprehensive demonstration of warm call transfer functionality built with LiveKit, OpenAI, and Twilio. This application showcases seamless call transfers between agents with AI-powered context sharing.

## 🎯 Features

- **Real-time Communication**: LiveKit-powered video/audio calls
- **AI-Powered Summaries**: OpenAI GPT generates call context for transfers
- **Phone Integration**: Twilio enables transfers to real phone numbers
- **Interactive UI**: Next.js frontend with role-based interfaces
- **Warm Transfer Flow**: Complete agent handoff with context preservation

## 🏗️ Architecture

The application consists of:
- **Backend**: Python FastAPI server handling room management, transfers, and API integrations
- **Frontend**: Next.js application with role-based UI for Caller, Agent A, and Agent B
- **LiveKit**: Real-time communication platform for audio/video calls
- **OpenAI**: AI service for generating call summaries
- **Twilio**: Telephony service for phone number integration

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- LiveKit account and server
- OpenAI API key
- Twilio account (for phone integration)

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp env.example .env

# Edit .env with your API keys
```

**Required Environment Variables:**
```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TARGET_PHONE=+1234567890

# Webhook Configuration
WEBHOOK_BASE_URL=https://yourdomain.com
```

### 2. Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Copy environment template
cp env.local.example .env.local

# Edit .env.local with your configuration
```

**Required Environment Variables:**
```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com

# Backend API URL
BACKEND_URL=http://localhost:8000
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🎮 How to Demo

### Step 1: Role Selection
1. Open http://localhost:3000
2. Choose your role: Caller, Agent A, or Agent B

### Step 2: Initial Call Setup
1. **Caller**: Click "Start Call" to connect to Agent A
2. **Agent A**: Click "Start Taking Calls" to connect to the system
3. **Agent B**: Click "Connect to Transfer System" to wait for transfers

### Step 3: Warm Transfer Process
1. **Agent A** receives the caller
2. **Agent A** clicks "Initiate Warm Transfer"
3. System generates AI summary and creates transfer room
4. **Agent A** is connected to transfer room with Agent B and Twilio call
5. **Agent A** reads the AI-generated summary to provide context
6. **Agent A** clicks "Complete Transfer" and exits
7. **Agent B** and caller remain connected with full context

## 🔧 API Endpoints

### Backend API (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/room/create` | POST | Create LiveKit room and generate access token |
| `/api/transfer/initiate` | POST | Initiate warm transfer with AI summary |
| `/api/transfer/complete` | POST | Complete transfer and disconnect Agent A |
| `/api/twilio/voice` | POST | Twilio webhook for phone call integration |

### Frontend API Routes (Next.js)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/room` | POST | Proxy to backend room creation |
| `/api/transfer` | POST | Proxy to backend transfer operations |
| `/api/twilio` | POST | Proxy to backend Twilio webhook |

## 🛠️ Technical Details

### LiveKit Integration
- Real-time audio/video communication
- Room-based participant management
- Token-based authentication
- WebRTC for low-latency streaming

### AI-Powered Summaries
- OpenAI GPT-3.5-turbo for call summarization
- Context-aware prompts for warm transfer scenarios
- Fallback summaries if AI service is unavailable

### Twilio Integration
- Programmable Voice API for phone calls
- SIP REFER method for call transfers
- TwiML responses for LiveKit room connection
- Webhook handling for call events

### Frontend Architecture
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- LiveKit client SDK for real-time features
- Role-based UI components

## 🐛 Troubleshooting

### Common Issues

**LiveKit Connection Failed**
- Verify LIVEKIT_URL is correct
- Check API key and secret
- Ensure LiveKit server is running

**OpenAI API Errors**
- Verify API key is valid
- Check API quota and billing
- Review rate limiting

**Twilio Integration Issues**
- Verify account credentials
- Check phone number format
- Ensure webhook URL is accessible

**Frontend Build Errors**
- Run `npm install` to update dependencies
- Check Node.js version compatibility
- Verify environment variables

## 📚 Additional Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Built with ❤️ for demonstrating modern real-time communication and AI integration**