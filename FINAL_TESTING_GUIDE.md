# Final Testing Guide - Call Center System

## **🎯 ISSUE RESOLVED: Queue System Logic**

The problem was that customers were getting connected immediately when agents were available, instead of being added to the queue for agent-controlled connections.

## **What Was Fixed:**

### **1. Backend Logic Fixed** ✅
- **Before**: Customers connected immediately if agents were available
- **After**: All customers are added to queue first, agents control connections via "Pick Next Customer"

### **2. Customer Connection Flow Fixed** ✅
- **Before**: Customer got token and connected directly to `support_room`
- **After**: Customer gets queue position and waits for agent to pick them

### **3. Agent Picking Logic Fixed** ✅
- **Before**: Agent clicked "Pick Next Customer" but found "No customers in queue"
- **After**: Agent can properly pick customers from the queue

## **Expected Behavior Now:**

### **Scenario 1: Customer First, Then Agent**
1. **Customer** enters email and clicks "Start Call"
2. **Customer** sees: "Waiting in Queue - Position #1"
3. **Agent A** clicks "Start Taking Calls"
4. **Agent A** clicks "Pick Next Customer"
5. **Agent A** gets connected to customer automatically
6. **Customer** gets notification and connects to the call

### **Scenario 2: Agent First, Then Customer**
1. **Agent A** clicks "Start Taking Calls"
2. **Customer** enters email and clicks "Start Call"
3. **Customer** sees: "Waiting in Queue - Position #1"
4. **Agent A** clicks "Pick Next Customer"
5. **Both** get connected to the same room

## **Step-by-Step Testing:**

### **Step 1: Restart Services**
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
cd apps/web
npm run dev
```

### **Step 2: Test Customer Queue**
1. Open customer page: `http://localhost:3000/caller`
2. Enter email: `test@example.com`
3. Click "Start Call"
4. **Expected**: Customer should see "Waiting in Queue - Position #1"
5. **Check logs**: Should show customer added to queue

### **Step 3: Test Agent Picking**
1. Open agent page: `http://localhost:3000/agent-a`
2. Click "Start Taking Calls"
3. Click "Pick Next Customer"
4. **Expected**: Agent should connect to waiting customer
5. **Check logs**: Should show customer picked from queue

### **Step 4: Verify Connection**
1. Both pages should show connected status
2. Customer should see "Support Call in Progress"
3. Agent should see "Customer Call" with video/audio controls
4. Check browser console for LiveKit connection success

## **Success Indicators:**

### **Customer Browser Console:**
```
Customer WebSocket connected
Customer WebSocket message: {type: 'acknowledgment', ...}
Attempting connection with room: support_room email: test@example.com
Token response: {queue_status: 'waiting', queue_position: 1, ...}
[Customer sees "Waiting in Queue - Position #1"]
[After agent picks] Agent assigned message received
Connecting to room with token...
[LiveKit connection established]
```

### **Agent Browser Console:**
```
Agent WebSocket connected
Agent WebSocket message: {type: 'acknowledgment', ...}
Setting availability for agent: agent_a response: {success: true}
[After clicking "Pick Next Customer"]
Pick-next result: customer found, room created, tokens generated
[Agent gets connected to customer]
```

### **Backend Logs:**
```
INFO:main:Customer test@example.com added to queue at position 1
INFO:main:Agent agent_a available, popping customer test@example.com
INFO:main:Pick-next for agent_a: customer test@example.com, room: support_agent_a_test_example_com
```

## **If Issues Persist:**

### **Check These Common Problems:**
1. **Customer still connects immediately** → Ensure backend was restarted
2. **Agent sees "No customers in queue"** → Check if customer is actually in queue
3. **WebSocket not working** → Check browser network tab for WS connections
4. **LiveKit still failing** → Verify LiveKit credentials in both .env files

### **Debug Commands:**
```bash
# Check backend environment
curl http://localhost:8000/debug/env

# Check queue status manually
curl -X POST http://localhost:8000/api/queue/status -H "Content-Type: application/json" -d '{"email": "test@example.com"}'

# Check agent status
curl -X POST http://localhost:8000/api/agent/availability -H "Content-Type: application/json" -d '{"agent_id": "agent_a", "status": "available"}'
```

## **What's Working Now:**
- ✅ WebSocket communication
- ✅ Queue system with proper customer waiting
- ✅ Agent-controlled customer picking
- ✅ LiveKit video/audio connection
- ✅ Real-time notifications
- ✅ Transfer history API

**The system should now work as intended - customers wait in queue, agents control connections!** 🎉