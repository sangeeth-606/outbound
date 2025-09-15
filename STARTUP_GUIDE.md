# Call Center System Startup Guide

## **Issues Fixed**

### 1. **404 Error on Agent Page**
- **Root Cause**: Missing WebSocket endpoint and backend API bugs
- **Fix**: Added proper WebSocket handling and fixed backend logging error

### 2. **Customer Connection Stuck on "Connecting..."**
- **Root Cause**: WebSocket connection failures and missing agent initialization
- **Fix**: Added direct backend WebSocket connection and proper agent status initialization

### 3. **Queue System Not Working**
- **Root Cause**: Agents not properly initialized and WebSocket notifications not working
- **Fix**: Added agent status initialization and proper WebSocket message handling

## **Startup Steps**

### 1. **Start Backend Server**
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend will run on: `http://localhost:8000`

### 2. **Start Frontend**
```bash
cd apps/web
npm install
npm run dev
```
Frontend will run on: `http://localhost:3000`

### 3. **Configure Environment Variables**
Copy the example environment files and update with your actual values:

**Backend (.env):**
```
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

**Frontend (.env.local):**
```
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_HOST=localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

## **Testing the Fixed Flow**

### **Scenario 1: Agent First, Then Customer**
1. **Open Agent A Page**: `http://localhost:3000/agent-a`
2. **Click "Start Taking Calls"** - Should show "You are now available to take calls"
3. **Open Customer Page**: `http://localhost:3000/caller`
4. **Enter Email**: `test@example.com`
5. **Click "Start Call"** - Should connect immediately to the available agent

### **Scenario 2: Customer First, Then Agent**
1. **Open Customer Page**: `http://localhost:3000/caller`
2. **Enter Email**: `test@example.com`
3. **Click "Start Call"** - Should show "Waiting in Queue" with position #1
4. **Open Agent A Page**: `http://localhost:3000/agent-a`
5. **Click "Start Taking Calls"** - Should automatically connect to the waiting customer

## **Expected Behavior**

### **Agent Page**
- ✅ No more 404 errors in console
- ✅ "Start Taking Calls" button works immediately
- ✅ WebSocket connection established for real-time notifications
- ✅ Auto-connects when customer is assigned

### **Customer Page**
- ✅ No more infinite "Connecting..." state
- ✅ Proper queue management with position display
- ✅ WebSocket notifications for agent assignment
- ✅ Immediate connection when agents are available

### **Backend Logs**
- ✅ Clean logs without errors
- ✅ Proper agent status management
- ✅ WebSocket message broadcasting
- ✅ Queue system working correctly

## **Troubleshooting**

### **WebSocket Connection Issues**
- Check if backend is running on port 8000
- Verify firewall settings
- Check browser console for WebSocket errors

### **LiveKit Connection Issues**
- Verify LiveKit server URL and credentials
- Check if LiveKit server is accessible
- Ensure proper CORS configuration

### **Queue System Issues**
- Check backend logs for agent status updates
- Verify WebSocket messages are being sent/received
- Ensure proper email identification in WebSocket messages

## **Key Files Modified**

1. **backend/main.py** - Fixed logging error and improved WebSocket handling
2. **backend/db_utils.py** - Added agent status initialization
3. **apps/web/app/caller/page.tsx** - Fixed WebSocket connection and queue logic
4. **apps/web/app/agent-a/page.tsx** - Added WebSocket notifications
5. **apps/web/app/api/token/route.ts** - Improved response structure
6. **apps/web/.env.local** - Added proper environment configuration

The system should now work correctly for both scenarios described in your original issue.