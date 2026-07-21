# Warm Transfer - Domain Context Glossary

This document serves as the project glossary defining key domain concepts, boundaries, and terms. 

## Domain Concepts

### Queue
A first-in-first-out (FIFO) list of customers waiting for assistance. A customer enters the queue by creating a wait room and leaves when connected to an agent or when they disconnect.

### Agent Status
The availability state of support agents. Valid states are:
- `offline`: Agent is not connected to the system.
- `available`: Agent is online and waiting to accept incoming customer calls.
- `busy`: Agent is actively connected to a call with a customer.

### Customer Assignment
The coordination logic that connects the first customer in the **Queue** with an **available** agent. Once paired, they are dynamically moved to a dedicated support room.

### Room
A LiveKit WebRTC session allowing real-time video/audio interaction between participants (caller, agent_a, agent_b, or transcription bots).

### Warm Transfer
A process where an agent escalates a customer call to another agent (or an external phone). Before handing off, the system automatically captures conversation context, generates an LLM summary, and shares this context with the receiving agent so the customer does not have to repeat themselves.

### Transcription Bot
A backend-controlled participant that connects to a active **Room**, subscribes to the audio track, buffers the incoming audio frames, and streams them to Deepgram for real-time transcription.
