"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

const LiveKitChatInterface = dynamic(
  () => import("../../components/LiveKitChatInterface"),
  { ssr: false }
);

export type Role = "agent_a" | "agent_b";

export default function AgentB() {
  const [roomName, setRoomName] = useState("");
  const role: Role = "agent_b";

  const handleOnCreateRoom = (room_name: string) => {
    setRoomName(room_name);
  };

  const handleOnEndCall = () => {
    setRoomName("");
  };

  const memoizedLiveKitChatInterface = useMemo(() => {
    return (
      <LiveKitChatInterface
        roomName={roomName}
        role={role}
        onRoomCreated={handleOnCreateRoom}
        onEndCall={handleOnEndCall}
      />
    );
  }, [roomName]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-text-label uppercase tracking-widest mb-1">Agent Bravo</h2>
        <p className="text-xs text-text-muted">Specialist transfers — handle escalated customer calls</p>
      </div>
      <div className="flex-1 min-h-0">
        {memoizedLiveKitChatInterface}
      </div>
    </div>
  );
}
