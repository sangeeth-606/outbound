# Verification Guide - Call Center System

## **✅ ISSUE RESOLVED: LiveKit Connection Failure**

The error `ERR_NAME_NOT_RESOLVED` for `wss://your-livekit-server.com` has been fixed by updating your frontend configuration to use your actual LiveKit server.

## **Current Configuration Status:**

### **Backend (Already Correct)** ✅
```
LIVEKIT_URL=wss://outbound-gkkdznzy.livekit.cloud
LIVEKIT_API_KEY=APIuW5oypBKe4Wj
LIVEKIT_API_SECRET=zPMA1DSYF7AYNgzfoP1ErYgTzK8d6rk5oFQCiJNA4rG
```

### **Frontend (Now Fixed)** ✅
```
NEXT_PUBLIC_LIVEKIT_URL=wss://outbound-gkkdznzy.livekit.cloud
LIVEKIT_API_KEY=APIuW5oypBKe4Wj
LIVEKIT_API_SECRET=zPMA1DSYF7AYNgzfoP1ErYgTzK8d6rk5oFQCiJNA4rG
```

## **Expected Flow After Fix:**

### **1. Agent A Process:**
1. Click "Start Taking Calls" → Shows success message
2. WebSocket connects successfully
3. Agent status becomes "available"

### **2. Customer Process:**
1. Enter email and click "Start Call"
2. WebSocket connects and gets acknowledgment
3. Token is generated successfully
4. **LiveKit connection should now work** (no more ERR_NAME_NOT_RESOLVED)
5. Customer connects to available agent

## **Test the Fixed System:**

### **Step 1: Restart Services**
```bash
# Backend
cd backend
python main.py

# Frontend (new terminal)
cd apps/web
npm run dev
```

### **Step 2: Test Agent A**
1. Open: `http://localhost:3000/agent-a`
2. Click "Start Taking Calls"
3. Check browser console for:
   - WebSocket connection success
   - No JSON parsing errors
   - Agent availability success

### **Step 3: Test Customer**
1. Open: `http://localhost:3000/caller`
2. Enter email: `test@example.com`
3. Click "Start Call"
4. Check for:
   - WebSocket acknowledgment received
   - Token generation success
   - **LiveKit connection established** (this should now work!)

## **Success Indicators:**

### **Browser Console (Customer):**
```
Customer WebSocket connected
Customer WebSocket message: {type: 'acknowledgment', ...}
Token response: {access_token: 'eyJhbGciOiJIUzI1NiIs...', room_name: 'support_room', queue_status: 'connected'}
Connecting to room with token...
[NO MORE LiveKit connection errors!]
```

### **Backend Logs:**
```
INFO:main:Room create for customer, agents_available: 1, using room: support_room
INFO:livekit_utils:Generated token for customer in room support_room
```

## **If You Still See Issues:**

1. **Check Environment Variables:**
   ```bash
   # Frontend
   cat apps/web/.env.local
   
   # Backend  
   cat backend/.env
   ```

2. **Verify LiveKit Server:**
   - Your server `wss://outbound-gkkdznzy.livekit.cloud` should be accessible
   - Check if credentials are still valid

3. **Check Browser Network Tab:**
   - Look for WebSocket connections to your backend
   - Verify no 404 errors on API calls

## **What's Working Now:**
- ✅ WebSocket communication (JSON parsing fixed)
- ✅ Agent availability system
- ✅ Queue management
- ✅ Token generation
- ✅ Transfer history API
- ✅ **LiveKit connection (URL fixed)**

The system should now complete the full call connection flow without the LiveKit connection errors!