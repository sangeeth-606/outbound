"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Room } from "livekit-client";
import { Phone, PhoneOff } from "lucide-react";

const LiveKitChatInterface = dynamic(
  () => import("../../components/LiveKitChatInterface"),
  { ssr: false }
);

export type Role = "agent_a" | "agent_b";

export default function AgentA() {
  const role: Role = "agent_a";
  const [roomName, setRoomName] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));

  const connectToRoom = useCallback(async () => {
    setIsConnecting(true);
    try {
      const name = `agent_room_${Date.now()}`;
      setRoomName(name);
      const resp = await fetch(`/api/token?room=${name}&username=${role}`);
      const data = await resp.json();
      const token = data.token || data.access_token;
      if (!token) throw new Error("No token received");
      await roomInstance.connect(
        process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://your-livekit-server.com",
        token
      );
      setIsConnected(true);
    } catch (e) {
      console.error("Failed to connect:", e);
    }
    setIsConnecting(false);
  }, [role, roomInstance]);

  const disconnect = useCallback(async () => {
    await roomInstance.disconnect();
    setIsConnected(false);
    setRoomName("");
  }, [roomInstance]);

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

  const memoizedChatInterface = useMemo(() => {
    if (!isConnected) return null;
    return (
      <LiveKitChatInterface
        room={roomInstance}
        localUserType="agent"
      />
    );
  }, [isConnected, roomInstance]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-text-label uppercase tracking-widest mb-1">Agent Alpha</h2>
        <p className="text-xs text-text-muted">First-line support — manage calls, transcriptions, and warm transfers</p>
      </div>
      <div className="flex-1 min-h-0">
        {isConnecting ? (
          <div className="h-full flex items-center justify-center">
            <div className="card p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-accent-red border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-xs text-text-muted">Connecting...</p>
            </div>
          </div>
        ) : isConnected ? (
          <>
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="flex items-center gap-2 text-xs text-accent-success">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
                Connected — Room: {roomName}
              </div>
              <button onClick={disconnect} className="btn btn-danger text-xs ml-auto">
                <PhoneOff className="w-3 h-3" />
                End Call
              </button>
            </div>
            <div className="h-[calc(100%-2.5rem)]">
              {memoizedChatInterface}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="card p-8 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-accent-red/15 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-accent-red" />
              </div>
              <h3 className="text-sm font-bold text-text-main mb-2">Ready for Calls</h3>
              <p className="text-xs text-text-muted mb-6">
                Click below to connect and start accepting support calls.
              </p>
              <button onClick={connectToRoom} className="btn btn-primary">
                <Phone className="w-4 h-4" />
                Start Call Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
