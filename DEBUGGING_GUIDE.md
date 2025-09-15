# Debugging Guide - Call Center System

## **Current Issues Fixed**

### 1. **WebSocket JSON Parsing Error** ✅ FIXED
- **Error**: `Failed to parse WebSocket message: SyntaxError: Unexpected token 'E', "Echo: {"ag"... is not valid JSON`
- **Cause**: Backend was sending "Echo: {data}" instead of proper JSON
- **Fix**: Changed to send proper JSON responses with type fields

### 2. **Missing Transfer History API** ✅ FIXED  
- **Error**: `GET http://localhost:3000/api/transfers/history?agent_id=agent_a&limit=20 404 (Not Found)`
- **Cause**: Missing API endpoint in frontend
- **Fix**: Created `/api/transfers/history/route.ts` to proxy to backend

### 3. **WebSocket Connection Issues** ✅ FIXED
- **Error**: `WebSocket error: 1001` (normal closure)
- **Cause**: Connection was closing unexpectedly
- **Fix**: Added proper WebSocketDisconnect handling and JSON error responses

## **Expected Behavior After Fixes**

### **Agent A Page Console Logs:**
```
Agent WebSocket connecting to: ws://localhost:8000/ws/notifications
Agent WebSocket connected
Agent WebSocket message: {type: 'acknowledgment', message: 'Message received', timestamp: '...'}
```

### **Backend Logs:**
```
INFO:main:🔌 New WebSocket connection established
INFO:main:📊 Total WebSocket connections: 1
INFO:main:👔 Agent identified: agent_a
```

## **Testing Steps**

### **1. Test WebSocket Connection**
1. Open Agent A page
2. Check browser console for WebSocket connection logs
3. Check backend logs for connection establishment

### **2. Test Agent Availability**
1. Click "Start Taking Calls" on Agent A page
2. Check backend logs for agent status update
3. Verify no JSON parsing errors in browser console

### **3. Test Customer Connection**
1. Open Customer page
2. Enter email and click "Start Call"
3. Check for proper queue behavior or immediate connection

## **Common Issues and Solutions**

### **WebSocket Still Closing**
- **Check**: Backend logs for specific error messages
- **Solution**: Ensure backend is running on port 8000
- **Debug**: Add more logging to identify disconnection cause

### **Transfer History Still 404**
- **Check**: Frontend API route exists at `apps/web/app/api/transfers/history/route.ts`
- **Solution**: Restart Next.js dev server after creating the file
- **Debug**: Test the endpoint directly: `curl http://localhost:3000/api/transfers/history?agent_id=agent_a`

### **Agent Not Receiving Notifications**
- **Check**: WebSocket connection status in browser network tab
- **Solution**: Verify agent identification message is sent
- **Debug**: Add console.log in WebSocket onmessage handler

## **Environment Variables Check**
Ensure these are set in your `.env.local`:
```
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_HOST=localhost:8000
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
```

## **Backend Environment Check**
Ensure these are set in your backend `.env`:
```
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

## **Next Steps**
1. Restart both backend and frontend servers
2. Test the WebSocket connection first
3. Then test the full agent-customer flow
4. Report any remaining errors with specific log messages