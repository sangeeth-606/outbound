import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client';

export interface LiveKitConfig {
  url: string;
  token: string;
  roomName: string;
}

export class LiveKitManager {
  private room: Room | null = null;
  private onParticipantConnected?: (participant: RemoteParticipant) => void;
  private onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;

  constructor(
    onParticipantConnected?: (participant: RemoteParticipant) => void,
    onParticipantDisconnected?: (participant: RemoteParticipant) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) {
    this.onParticipantConnected = onParticipantConnected;
    this.onParticipantDisconnected = onParticipantDisconnected;
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
  }

  async connect(config: LiveKitConfig): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoSimulcastLayers: [
            { resolution: { width: 320, height: 180 }, encoding: { maxBitrate: 200_000 } },
            { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 500_000 } },
            { resolution: { width: 1280, height: 720 }, encoding: { maxBitrate: 1_000_000 } },
          ],
        },
      });

      // Set up event listeners
      this.room.on(RoomEvent.Connected, () => {
        console.log('Connected to room');
        this.onConnected?.();
      });

      this.room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        this.onDisconnected?.();
      });

      this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        this.onParticipantConnected?.(participant);
      });

      this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        this.onParticipantDisconnected?.(participant);
      });

      // Connect to the room
      await this.room.connect(config.url, config.token);
      
      // Enable camera and microphone
      await this.room.localParticipant.enableCameraAndMicrophone();
      
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  async toggleMicrophone(): Promise<void> {
    if (this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(
        !this.room.localParticipant.isMicrophoneEnabled
      );
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.room) {
      await this.room.localParticipant.setCameraEnabled(
        !this.room.localParticipant.isCameraEnabled
      );
    }
  }

  getRoom(): Room | null {
    return this.room;
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant || null;
  }

  getRemoteParticipants(): RemoteParticipant[] {
    return this.room ? Array.from(this.room.remoteParticipants.values()) : [];
  }

  isConnected(): boolean {
    return this.room?.state === 'connected';
  }

  isMicrophoneEnabled(): boolean {
    return this.room?.localParticipant.isMicrophoneEnabled || false;
  }

  isCameraEnabled(): boolean {
    return this.room?.localParticipant.isCameraEnabled || false;
  }
}

// Utility function to get LiveKit server URL
export function getLiveKitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com';
}
