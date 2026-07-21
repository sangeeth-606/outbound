# Warm Transfer Repository - Research Notes

## 1. Domain and Codebase Purpose
The "Warm Transfer" application is a customer support demo that orchestrates real-time video/audio calls, queue management, AI-driven transcription, and summary generation. It demonstrates a "warm transfer" flow where a customer speaking with Agent A can be transferred to Agent B (or a Twilio phone call) with the context of their conversation seamlessly passed along via an LLM-generated summary.

## 2. Core Architecture and Data Flow
- **Frontend (Next.js 15.5, React 19):** Uses `@livekit/components-react` for the UI of the call. Includes roles for `/caller`, `/agent-a`, and `/agent-b`. Implements a Backend-For-Frontend (BFF) pattern in `apps/web/app/api` routes.
- **Backend (FastAPI 0.104.1):** Serves as the central orchestrator. Maintains an in-memory queue of customers and agent statuses. Broadcasts real-time events (queue updates, transfer initiations) via WebSockets (`/ws/notifications`).
- **LiveKit:** Manages WebRTC audio/video rooms.
- **Deepgram:** Transcribes live audio to text.
- **Groq:** Uses Llama 3.1 to generate concise summaries of call transcripts or chat history before a transfer occurs.
- **Twilio:** Handles fallback "phone" transfers by generating TwiML to dial SIP endpoints or provide web links.

**Transfer Flow:**
1. Caller joins and waits in queue.
2. Available Agent picks caller. Backend creates a LiveKit room and assigns tokens.
3. During the call, audio is streamed to Deepgram for real-time transcription.
4. Agent A initiates a transfer to Agent B.
5. The chat/transcription context is sent to Groq LLM to generate a summary.
6. Backend signals Agent B to join the *existing* room (no room switching required) or triggers a Twilio voice webhook for external phone agents.

## 3. Deep Dive into Integrations
- **LiveKit:**
  - Token generation is split: Frontend generates direct agent tokens via `livekit-server-sdk`, while backend generates customer tokens via `livekit_utils.py` and returns them through `/api/room/create`.
  - Backend uses `livekit.rtc` to join rooms as a hidden bot (`transcription_bot`) and listens to audio frames (`on_audio_frame`) to chunk and send to Deepgram.
- **Deepgram:**
  - Implemented in `deepgram_utils.py` using `RealTimeTranscription`. It receives linear16 audio chunks from LiveKit and returns transcription events with speaker diarization.
- **Groq:**
  - Standard REST POST request in `llm_utils.py` to `api.groq.com/openai/v1/chat/completions` using `llama-3.1-8b-instant`.
- **Twilio:**
  - Handled in `twilio_utils.py`. Uses TwiML `<Say>` to speak the AI summary to the external agent, then uses `<Dial><Sip>` to connect them to the LiveKit room SIP endpoint.

## 4. Outdated Dependencies and Technical Debt
- **Backend Python Dependencies:**
  - `livekit==0.8.0` and `livekit-api==0.3.0` are severely outdated. The modern LiveKit SDK is `> 0.17` and `> 0.6` respectively.
  - `deepgram-sdk==3.2.0` is older; newer versions exist that simplify realtime streaming.
  - `fastapi==0.104.1` is slightly behind but functional.
- **Frontend Dependencies:**
  - Frontend uses modern `next@15.5.0` and `react@19.1.0`.
  - `livekit-client` is `^2.0.0` and `@livekit/components-react` is `^2.3.1`, which are relatively modern compared to the backend.
- **State Management:**
  - The Python backend uses global in-memory variables (`customer_queue`, `agent_status`) for state, which is not scalable or persistent.

## 5. Architectural Friction Points (Codebase-Design)
- **Shallow Modules:** `llm_utils.py`, `deepgram_utils.py`, and `db_utils.py` are extremely shallow. `db_utils.py` provides no leverage—it merely wraps global dicts/deques with getters and setters, offering no real database adapter depth.
- **Poor Locality:** `main.py` is over 1,200 lines long and handles routing, queue manipulation, WebSocket broadcasting, and string-formatting of LLM prompts in line. This means bugs and changes related to any of these domains will concentrate here.
- **Interface Seams & Adapters:** The system lacks clean seams for dependencies. For instance, `RoomTranscriptionManager` mixes LiveKit API logic (`RoomEvent` listeners) and Deepgram byte-chunking logic in a single class without interfaces.
- **Split Responsibilities (Tokens):** Agent token generation lives in the Next.js frontend (`apps/web/app/api/token/route.ts`), while Customer token generation lives in the FastAPI backend (`backend/main.py`). This fragments room authority.
