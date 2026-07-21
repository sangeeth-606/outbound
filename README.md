# Warm Transfer 

A comprehensive demonstration of warm call transfer functionality built with LiveKit, Groq LLM, and Twilio. This application showcases seamless call transfers between agents with AI-powered context sharing, real-time transcription, and advanced analytics.

## 🎯 Features

- **Real-time Communication**: LiveKit-powered video/audio calls with WebRTC
- **AI-Powered Summaries**: Groq LLM generates intelligent call context for transfers
- **Phone Integration**: Twilio enables transfers to real phone numbers with SIP REFER
- **Interactive UI**: Next.js frontend with role-based interfaces for Caller, Agent A, and Agent B
- **Warm Transfer Flow**: Complete agent handoff with context preservation and AI summaries
- **Real-time Transcription**: Deepgram-powered speech-to-text with AI chat responses
- **Analytics Dashboard**: Comprehensive metrics and transfer history tracking
- **WebSocket Notifications**: Real-time updates for transfer events and call status
- **Multi-modal Support**: Support for web calls, phone calls, and hybrid scenarios

## 🏗️ Architecture

The application follows a modern microservices architecture with clear separation of concerns:

### System Architecture Diagram

```mermaid
graph TB
    A[Next.js Frontend] --> B[API Routes]
    B --> C[FastAPI Backend]
    C --> D[LiveKit Server]
    C --> E[Groq LLM API]
    C --> F[Twilio API]
    C --> G[Deepgram API]

    A --> H[WebRTC]
    H --> D

    I[Phone Caller] --> F
    F --> J[SIP REFER]
    J --> D

    K[Agent A] --> A
    L[Agent B] --> A
    M[Caller] --> A

    N[Analytics DB] --> C
    O[Transfer History] --> C
```

### Component Overview

- **Backend (Python/FastAPI)**: Core business logic, API endpoints, integrations
- **Frontend (Next.js/TypeScript)**: User interfaces, real-time components, API proxy
- **LiveKit**: Real-time communication platform for audio/video/WebRTC
- **Groq**: Free AI service for generating call summaries and chat responses
- **Twilio**: Telephony service for phone number integration and SIP transfers
- **Deepgram**: Speech-to-text transcription service
- **WebSocket**: Real-time notifications and status updates

## 📋 Prerequisites

- **Python 3.8+** with pip package manager
- **Node.js 18+** with npm package manager
- **LiveKit Account**: Cloud or self-hosted LiveKit server
- **Groq API Key**: Free account at console.groq.com
- **Twilio Account**: For phone integration (optional for web-only demo)
- **Deepgram API Key**: For transcription features (optional)

## 🚀 Setup Instructions

### 1. Clone and Initialize

```bash
git clone <repository-url>
cd outbound
```

### 2. Install Root Dependencies

```bash
# Install global workspace dependencies
npm install

# This installs Turbo for monorepo management and shared utilities
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt


# Copy environment template and configure
cp env.example .env
```

**Backend Dependencies Installed:**
- `fastapi==0.104.1` - High-performance web framework
- `uvicorn[standard]==0.24.0` - ASGI server
- `livekit==0.8.0` & `livekit-api==0.3.0` - Real-time communication
- `twilio==8.10.0` - Phone integration
- `deepgram-sdk==3.2.0` - Speech transcription
- `websockets==12.0` - Real-time notifications

### 4. Frontend Setup

```bash
cd apps/web

# Install Node.js dependencies (from workspace root)
cd ../../
npm install

# Copy environment template
cd apps/web
cp env.local.example .env.local
```

**Frontend Dependencies Included:**
- Next.js 14 with App Router
- TypeScript and Tailwind CSS
- LiveKit React components
- Shared ESLint and TypeScript configs

### 4. Environment Configuration Guide

#### Getting API Keys

**LiveKit Setup:**
1. Visit [LiveKit Cloud](https://cloud.livekit.io) or [set up self-hosted](https://docs.livekit.io/deploy/)
2. Create a new project and get your API key and secret
3. Note your WebSocket URL (e.g., `wss://your-project.livekit.cloud`)

**Groq Setup (Free AI API):**
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Generate an API key (free tier includes significant usage)
4. Model used: `llama-3.1-70b-versatile` for call summaries

**Twilio Setup (Optional - for phone integration):**
1. Create account at [twilio.com](https://www.twilio.com)
2. Get Account SID and Auth Token from console
3. Purchase a phone number for outbound calls
4. Configure webhook URLs for call status callbacks

**Deepgram Setup (Optional - for enhanced transcription):**
1. Visit [deepgram.com](https://deepgram.com)
2. Sign up and get API key
3. Used for real-time speech-to-text transcription

#### Backend Environment (.env)
```env
# LiveKit Configuration - REQUIRED
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_key_here

# Groq Configuration - REQUIRED for AI features
groq_key=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Configuration - OPTIONAL (for phone integration)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_TARGET_PHONE=+15551234568

# Deepgram Configuration - OPTIONAL (fallback transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Webhook Configuration - REQUIRED for Twilio callbacks
WEBHOOK_BASE_URL=https://yourdomain.com
```

#### Frontend Environment (.env.local)
```env
# LiveKit Configuration - REQUIRED
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your_secret_key_here

# Backend API URL - REQUIRED
BACKEND_URL=http://localhost:8000
```

**Note:** The frontend needs LiveKit credentials for token generation in API routes.

### 5. Run the Application

#### Option A: Individual Services (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
# From project root (uses Turbo for optimized builds)
npm run dev

# Or specifically:
cd apps/web
npm run dev
```

#### Option B: Monorepo Commands (Alternative)

**From project root:**
```bash
# Run all development servers
npm run dev

# Build all packages
npm run build

# Lint all packages
npm run lint

# Type checking
npm run check-types
```

#### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

#### Verify Setup
1. Open http://localhost:3000 - should see role selection page
2. Open http://localhost:8000/docs - should see API documentation
3. Check browser console for any connection errors
4. Test with minimal LiveKit credentials to ensure connection

## 🎮 Complete Workflow Guide

### Role Overview
- **Caller**: Customer needing support, can be web-based or phone-based
- **Agent A**: First-line support agent, handles initial calls and initiates transfers
- **Agent B**: Escalation agent, receives transfers with AI-generated context

### Detailed Warm Transfer Workflow

#### Phase 1: Initial Call Setup
1. **Agent A Preparation**:
   - Navigate to http://localhost:3000 and select "Agent A"
   - Click "Start Taking Calls" to join the system
   - Agent A interface includes:
     - Live transcription display
     - Chat interface with AI responses
     - Transfer initiation controls
     - Call status indicators

2. **Caller Connection**:
   - Open new browser tab/window to http://localhost:3000
   - Select "Caller" role
   - Click "Start Call" to connect to Agent A
   - Caller interface includes:
     - Video/audio controls
     - Live transcription (view-only)
     - Basic call controls

3. **Agent B Standby**:
   - Open third browser tab/window to http://localhost:3000
   - Select "Agent B" role
   - Click "Connect to Transfer System"
   - Agent B interface ready for incoming transfers

#### Phase 2: Conversation and Context Building
1. **Active Conversation**:
   - Agent A and Caller engage in real-time conversation
   - System automatically transcribes speech using Deepgram
   - AI chat responses available for Agent A via chat interface
   - All conversation context is captured for transfer summary

2. **Real-time Features Active**:
   - **Live Transcription**: Shows what both parties are saying
   - **AI Chat**: Agent A can ask AI for help with responses
   - **Context Capture**: All audio/text is processed for summary generation

#### Phase 3: Transfer Initiation (The Core Feature)
1. **Agent A Initiates Transfer**:
   ```
   Agent A decides caller needs escalation → Clicks "Initiate Warm Transfer"
   ```

2. **Automatic AI Summary Generation**:
   ```
   System sends conversation context to Groq LLM → Generates intelligent summary
   ```
   - Includes key conversation points
   - Identifies caller's issue and emotional state
   - Suggests resolution strategies
   - Formatted for quick Agent B review

3. **Transfer Room Creation**:
   ```
   System creates new LiveKit room → All three participants connected
   ```
   - Agent A temporarily disconnected from original room
   - New three-way room created with Agent A, Agent B, and Caller
   - Seamless audio/video transition

#### Phase 4: Agent Handoff
1. **Three-way Introduction**:
   - Agent A introduces Agent B to the caller
   - Agent A reviews AI-generated summary with Agent B
   - Context and background shared efficiently

2. **Agent A Context Transfer**:
   - Agent A explains situation to Agent B
   - AI summary provides comprehensive background
   - Caller remains connected throughout transition

3. **Transfer Completion**:
   ```
   Agent A clicks "Complete Transfer" → Exits room → Agent B continues with caller
   ```

#### Phase 5: Continued Support
1. **Agent B Takes Over**:
   - Agent B and caller continue conversation
   - Full context preserved from original call
   - Transfer history recorded for analytics

2. **Optional Phone Integration**:
   - If Twilio configured, Agent B can receive phone call
   - SIP REFER used for seamless phone transfer
   - Web and phone participants can coexist

### Alternative Workflows

#### Phone-to-Web Transfer
1. Caller dials Twilio number
2. Twilio connects call to LiveKit room via SIP
3. Agent A joins via web interface
4. Standard warm transfer process continues
5. Agent B can join via phone or web

#### Web-to-Phone Transfer
1. Standard web-based initial call
2. Agent A initiates transfer
3. System calls Agent B's phone via Twilio
4. Agent B joins transfer room via phone
5. Agent A completes transfer and exits

#### Emergency Escalation
1. Agent A can force-complete transfer if needed
2. System automatically handles disconnection
3. Agent B notified via WebSocket of urgent transfer
4. Full context and summary still provided

### Testing Scenarios

#### Basic Web Transfer Test
```bash
# Terminal 1: Start backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2: Start frontend  
npm run dev

# Browser 1: Agent A (http://localhost:3000 → Agent A)
# Browser 2: Caller (http://localhost:3000 → Caller)  
# Browser 3: Agent B (http://localhost:3000 → Agent B)

# Test flow: Caller calls → Agent A answers → Transfer → Agent B receives
```

#### AI Summary Generation Test
1. Have meaningful conversation between Agent A and Caller
2. Discuss specific topics (e.g., billing issue, technical problem)
3. Initiate transfer and review AI-generated summary quality
4. Verify summary captures key points and context

#### Phone Integration Test (Requires Twilio)
1. Configure Twilio credentials in backend .env
2. Set up public webhook URL (ngrok recommended for testing)
3. Call Twilio number from real phone
4. Test transfer to Agent B's phone number

## 📚 API Documentation

### Backend API Endpoints (FastAPI)

#### Core Functionality

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/room/create` | POST | Create LiveKit room and generate access token | `CreateRoomRequest` | `CreateRoomResponse` |
| `/api/transfer/initiate` | POST | Initiate warm transfer with AI summary | `TransferInitiateRequest` | `TransferInitiateResponse` |
| `/api/transfer/complete` | POST | Complete transfer and disconnect Agent A | `TransferCompleteRequest` | `TransferCompleteResponse` |

#### Twilio Integration

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/twilio/voice` | POST | Twilio webhook for phone call connection | `room_name`, `summary` | TwiML Response |
| `/api/twilio/status` | POST | Handle Twilio call status callbacks | Call status data | Status confirmation |
| `/api/twilio/transfer` | POST | Initiate Twilio phone call for transfer | Transfer details | Call initiation response |
| `/api/twilio/call/{call_sid}` | GET | Get status of specific Twilio call | - | Call details |

#### AI and Communication Features

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/chat` | POST | Handle chat messages with AI responses | `ChatRequest` | `ChatResponse` |
| `/api/transcribe` | POST | Transcribe audio and generate AI response | `TranscribeRequest` | `TranscribeResponse` |
| `/api/generate-summary` | POST | Generate AI-powered call summary | Summary request | Summary response |

#### Analytics and History

| Endpoint | Method | Description | Query Params | Response |
|----------|--------|-------------|--------------|----------|
| `/api/analytics` | GET | Get analytics data for dashboard | `time_range` | Analytics data |
| `/api/transfers/history` | GET | Get transfer history for agents | `agent_id`, `limit` | Transfer history |

#### Utility Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/caller/context` | POST | Get caller context from database | `CallerContextRequest` | `CallerContextResponse` |
| `/api/room/cleanup` | POST | Clean up empty rooms | `room_name` | Cleanup status |
| `/debug/env` | GET | Debug environment variables | - | Environment data |

### Frontend API Routes (Next.js)

All frontend API routes proxy requests to the backend FastAPI server:

| Route | Method | Backend Proxy | Description |
|-------|--------|---------------|-------------|
| `/api/room` | POST | `/api/room/create` | Room creation proxy |
| `/api/transfer` | POST | `/api/transfer/initiate` | Transfer initiation proxy |
| `/api/twilio-transfer` | POST/GET | `/api/twilio/transfer` | Twilio transfer proxy |
| `/api/chat` | POST | `/api/chat` | Chat functionality proxy |
| `/api/transcribe` | POST | `/api/transcribe` | Transcription proxy |
| `/api/generate-summary` | POST | `/api/generate-summary` | Summary generation proxy |

### WebSocket Endpoints

| Endpoint | Purpose | Message Types |
|----------|---------|---------------|
| `/ws/notifications` | Real-time transfer notifications | `transfer_initiated`, `transfer_completed`, `twilio_call_status` |

## 🔧 Technical Details

### LiveKit Integration
- **Real-time Communication**: WebRTC-based audio/video calls
- **Room Management**: Dynamic room creation and participant management
- **Token Authentication**: Secure access tokens for room participation
- **Low-latency Streaming**: Optimized for real-time communication
- **Multi-platform Support**: Web, mobile, and SIP integration

### AI-Powered Features
- **Groq LLM Integration**: Llama-3.1-70b-versatile for intelligent summarization
- **Context-Aware Prompts**: Dynamic prompts based on caller type and conversation history
- **Fallback Handling**: Graceful degradation when AI services are unavailable
- **Conversation Memory**: Maintains chat history for coherent AI responses

### Twilio Integration
- **Programmable Voice API**: Full telephony integration
- **SIP REFER Method**: Standards-compliant call transfers
- **TwiML Responses**: XML-based call control
- **Webhook Handling**: Real-time call event processing
- **Status Callbacks**: Comprehensive call lifecycle tracking

### Frontend Architecture
- **Next.js 14**: App Router with server and client components
- **TypeScript**: Full type safety and IntelliSense support
- **Tailwind CSS**: Utility-first styling with responsive design
- **LiveKit React Components**: Pre-built UI components for real-time features
- **Role-based UI**: Specialized interfaces for different user types
- **Framer Motion**: Smooth animations and transitions

### Backend Architecture
- **FastAPI Framework**: High-performance async API server
- **Pydantic Models**: Data validation and serialization
- **CORS Middleware**: Cross-origin request handling
- **WebSocket Support**: Real-time bidirectional communication
- **Environment Configuration**: Secure credential management
- **Logging**: Comprehensive request/response logging

## 🐛 Troubleshooting Guide

### Common Issues and Solutions

#### LiveKit Connection Problems
**Issue**: "Failed to connect to LiveKit server"
- **Solution**: Verify `LIVEKIT_URL` is correct and accessible
- **Check**: Ensure API key and secret are valid
- **Test**: Confirm LiveKit server is running and reachable

**Issue**: "Room creation failed"
- **Solution**: Check LiveKit server permissions
- **Check**: Verify network connectivity to LiveKit endpoint
- **Test**: Use LiveKit dashboard to test server connectivity

#### AI/LLM Service Issues
**Issue**: "Groq API errors"
- **Solution**: Verify `groq_key` is valid and has quota remaining
- **Check**: Review Groq service status at console.groq.com
- **Fallback**: System continues with basic transfer functionality

**Issue**: "Transcription not working"
- **Solution**: Check Deepgram API key configuration
- **Check**: Verify audio input permissions in browser
- **Test**: Test microphone access and audio levels

#### Twilio Integration Issues
**Issue**: "Phone call not connecting"
- **Solution**: Verify all Twilio credentials are correct
- **Check**: Ensure phone numbers are in E.164 format
- **Test**: Check Twilio dashboard for call logs and errors

**Issue**: "Webhook not receiving events"
- **Solution**: Confirm `WEBHOOK_BASE_URL` is publicly accessible
- **Check**: Verify webhook endpoint is responding correctly
- **Test**: Use Twilio debugger for webhook delivery status

#### Frontend Build/Development Issues
**Issue**: "npm install fails"
- **Solution**: Clear npm cache and node_modules
- **Check**: Verify Node.js version compatibility (18+)
- **Command**: `rm -rf node_modules package-lock.json && npm install`

**Issue**: "Environment variables not loading"
- **Solution**: Ensure `.env.local` is in the correct directory
- **Check**: Restart development server after env changes
- **Test**: Use browser dev tools to verify env vars

#### Backend/Python Issues
**Issue**: "Module not found" errors
- **Solution**: Activate virtual environment: `source venv/bin/activate`
- **Check**: Install all requirements: `pip install -r requirements.txt`
- **Test**: Verify Python version: `python --version`

**Issue**: "Port 8000 already in use"
- **Solution**: Kill existing process or use different port
- **Command**: `lsof -ti:8000 | xargs kill -9`
- **Alternative**: `uvicorn main:app --port 8001`

### Performance Optimization
- **Frontend Caching**: Implement Redis for session and token caching
- **Database**: Add PostgreSQL with connection pooling for production
- **CDN**: Use CDN for static assets and media files
- **Monitoring**: Add application performance monitoring (Sentry, DataDog)
- **Scaling**: Horizontal scaling with load balancer and container orchestration

### Security Considerations
- **API Keys**: Never commit secrets to version control (use .env files)
- **HTTPS**: Always use HTTPS in production (Let's Encrypt recommended)
- **CORS**: Configure appropriate CORS policies for production domains
- **Rate Limiting**: Implement rate limiting on API endpoints (redis-rate-limit)
- **Input Validation**: All user inputs validated with Pydantic models
- **Authentication**: Consider adding JWT authentication for production use

### Production Database Setup
For production deployment, replace file-based storage with PostgreSQL:

```python
# Add to requirements.txt
psycopg2-binary==2.9.7
sqlalchemy==2.0.23

# Database configuration in .env
DATABASE_URL=postgresql://user:password@localhost:5432/outbound_db
```

Migration from file-based to PostgreSQL database with proper schema for:
- Call records and analytics
- Transfer history and metrics  
- User sessions and authentication
- Real-time notification queues

## 📊 Analytics and Monitoring

### Available Metrics
- **Transfer Statistics**: Success rates, duration, failure reasons
- **Call Metrics**: Volume, duration, peak hours, daily patterns
- **Agent Performance**: Individual success rates, handle times
- **Real-time Metrics**: Active calls, queue status, wait times

### Dashboard Features
- **Time Range Filtering**: 1 day, 7 days, 30 days, 90 days
- **Export Capabilities**: CSV/JSON export for reporting
- **Real-time Updates**: Live metrics with WebSocket updates
- **Historical Data**: Transfer history with search and filtering

## 🔄 Development Workflow

### Code Organization
```
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── models.py           # Pydantic data models
│   ├── requirements.txt    # Python dependencies
│   └── utils/              # Utility modules
├── apps/web/               # Next.js frontend
│   ├── app/                # Next.js app router
│   ├── components/         # React components
│   └── lib/                   # Utility libraries
└── packages/               # Shared packages (ESLint, TypeScript config)
```

### Testing Strategy
- **Unit Tests**: Individual function/component testing
- **Integration Tests**: API endpoint and component integration
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load testing for concurrent users

### Deployment Considerations
- **Containerization**: Docker support included
- **Environment Separation**: Development, staging, production configs
- **Scalability**: Horizontal scaling with load balancer
- **Backup**: Database and configuration backups

## 📚 Additional Resources

### Official Documentation
- [LiveKit Documentation](https://docs.livekit.io/) - Real-time communication platform
- [Groq API Reference](https://console.groq.com/docs) - AI/LLM service
- [Twilio Voice API](https://www.twilio.com/docs/voice) - Telephony integration
- [Deepgram API](https://developers.deepgram.com/) - Speech transcription
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Backend framework

### Community and Support
- [LiveKit Community](https://github.com/livekit/livekit) - GitHub discussions
- [Twilio Community](https://www.twilio.com/docs/community) - Developer forums
- [Next.js Community](https://nextjs.org/community) - Discord and GitHub

### Related Technologies
- [WebRTC](https://webrtc.org/) - Real-time communication standard
- [SIP Protocol](https://www.ietf.org/rfc/rfc3261.txt) - VoIP signaling
- [TwiML](https://www.twilio.com/docs/voice/twiml) - Twilio markup language

---

**Built with ❤️ for demonstrating modern real-time communication, AI integration, and enterprise-grade call center functionality. Perfect for job applications showcasing full-stack development, real-time systems, and cloud integrations.**

## 📁 Project Structure Deep Dive

### Directory Overview
```
outbound/                           # Root project directory
├── README.md                       # This comprehensive guide
├── package.json                    # Workspace configuration (Turbo monorepo)
├── turbo.json                      # Turbo build pipeline configuration
├── docker-compose.yml              # Container orchestration
├── setup.sh                        # Automated setup script
├── *.md                           # Additional documentation files
│
├── apps/                          # Application packages
│   └── web/                       # Next.js frontend application
│       ├── package.json           # Frontend dependencies
│       ├── next.config.js         # Next.js configuration
│       ├── tailwind.config.js     # Tailwind CSS configuration
│       ├── tsconfig.json          # TypeScript configuration
│       ├── app/                   # Next.js App Router pages
│       │   ├── layout.tsx         # Root layout component
│       │   ├── page.tsx           # Landing page (role selection)
│       │   ├── agent-a/           # Agent A interface
│       │   │   └── page.tsx       # Agent A dashboard
│       │   ├── agent-b/           # Agent B interface
│       │   │   └── page.tsx       # Agent B dashboard
│       │   ├── caller/            # Caller interface
│       │   │   └── page.tsx       # Caller call interface
│       │   ├── support/           # Support dashboard
│       │   │   └── page.tsx       # Analytics and history
│       │   └── api/               # Next.js API routes (proxy to backend)
│       │       ├── room/          # LiveKit room management
│       │       ├── transfer/      # Transfer operations
│       │       ├── chat/          # AI chat functionality
│       │       └── twilio-transfer/ # Twilio integration
│       ├── components/            # Reusable React components
│       │   ├── ChatInterface.tsx           # AI chat component
│       │   ├── LiveKitChatInterface.tsx    # LiveKit-integrated chat
│       │   ├── MiniLiveTranscription.tsx   # Real-time transcription UI
│       │   └── TransferHistory.tsx         # Transfer history display
│       └── lib/                   # Utility libraries
│           └── livekit.ts         # LiveKit configuration and helpers
│
├── backend/                       # Python FastAPI backend
│   ├── main.py                    # FastAPI application entry point
│   ├── models.py                  # Pydantic data models
│   ├── requirements.txt           # Python dependencies
│   ├── env.example               # Environment template
│   ├── ai_chat_utils.py          # AI/LLM integration utilities
│   ├── db_utils.py               # Database operations
│   ├── deepgram_utils.py         # Deepgram transcription
│   ├── livekit_utils.py          # LiveKit server integration
│   ├── llm_utils.py              # Language model utilities
│   └── twilio_utils.py           # Twilio telephony integration
│
├── packages/                     # Shared packages (monorepo utilities)
│   ├── eslint-config/           # Shared ESLint configuration
│   ├── typescript-config/       # Shared TypeScript configuration
│   └── ui/                      # Shared UI components (if needed)
│
└── nextjs-live-transcription-main/ # Reference Deepgram integration
    └── [Deepgram example files]   # Example transcription implementation
```

### Key Component Explanations

#### Frontend Architecture (Next.js 14)

**App Router Structure:**
- `app/layout.tsx`: Root layout with global providers and styling
- `app/page.tsx`: Landing page with role selection (Caller/Agent A/Agent B)
- Role-specific pages with optimized interfaces for each user type

**Core Components:**
- **MiniLiveTranscription**: Real-time transcription display with state management
- **ChatInterface**: AI-powered chat with context-aware responses  
- **LiveKitChatInterface**: Integration between LiveKit and chat functionality
- **TransferHistory**: Analytics and transfer tracking interface

**API Routes (Next.js):**
All API routes proxy to the backend FastAPI server, providing:
- Authentication and CORS handling
- Request/response transformation
- Error handling and logging
- Frontend-backend communication layer

#### Backend Architecture (FastAPI)

**Core Files:**
- `main.py`: FastAPI app with all endpoints, CORS, and WebSocket handling
- `models.py`: Pydantic schemas for request/response validation
- Individual utility modules for each service integration

**Service Integration Modules:**
- `livekit_utils.py`: Room creation, token generation, participant management
- `twilio_utils.py`: Voice calls, SIP integration, webhook handling
- `llm_utils.py`: Groq API integration for AI summaries and chat
- `deepgram_utils.py`: Real-time transcription and audio processing
- `ai_chat_utils.py`: Context-aware AI responses and conversation memory
- `db_utils.py`: Data persistence and analytics (file-based for demo)

#### Shared Configuration

**Monorepo Setup:**
- `turbo.json`: Defines build pipeline and task dependencies
- `package.json`: Workspace configuration with shared scripts
- Shared ESLint and TypeScript configs for consistency

**Environment Management:**
- Template files for easy setup
- Separate frontend/backend configuration
- Clear documentation for required vs optional services

### Data Flow Architecture

#### Call Initiation Flow
```
Caller (Browser) → Next.js Frontend → API Route → FastAPI Backend → LiveKit Room Creation
                                                                   → Token Generation  
                                                                   → WebSocket Connection
```

#### Transfer Flow
```
Agent A Initiates Transfer → FastAPI Endpoint → Conversation Context Extraction
                                              → Groq LLM Summary Generation
                                              → New LiveKit Room Creation
                                              → Three-way Connection Setup
                                              → WebSocket Notifications
```

#### AI Integration Flow  
```
Voice Input → Deepgram Transcription → Context Building → Groq LLM Processing → AI Response
                                     → Conversation Memory → Summary Generation → Transfer Context
```

#### Phone Integration Flow
```
Phone Call → Twilio Webhook → FastAPI Handler → LiveKit SIP Connection → Room Join
                                              → Status Callbacks → WebSocket Updates
```

### Docker Deployment (Optional)

The project includes Docker support for containerized deployment:

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Docker Services:**
- **Frontend**: Next.js app served on port 3000
- **Backend**: FastAPI server on port 8000
- Automatic environment variable injection
- Volume mounting for development

### Production Deployment Checklist

#### Security Configuration
- [ ] Change all default API keys and secrets
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure proper CORS policies
- [ ] Set up rate limiting on API endpoints
- [ ] Enable request logging and monitoring
- [ ] Configure firewall rules for service ports

#### Performance Optimization  
- [ ] Enable Redis for session caching
- [ ] Configure CDN for static assets
- [ ] Set up database connection pooling
- [ ] Enable gzip compression
- [ ] Configure load balancer for horizontal scaling

#### Monitoring and Analytics
- [ ] Set up application performance monitoring (APM)
- [ ] Configure log aggregation (ELK stack or similar)
- [ ] Enable health check endpoints
- [ ] Set up alerting for critical failures
- [ ] Configure backup and disaster recovery

#### Environment-Specific Settings
```bash
# Production backend environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@prod-db:5432/dbname
REDIS_URL=redis://prod-redis:6379/0
```