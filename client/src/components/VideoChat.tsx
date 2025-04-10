import { useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoChatProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  currentPartner: any;
  onStartChatting: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

export default function VideoChat({
  localStream,
  remoteStream,
  isConnected,
  isVideoEnabled,
  isAudioEnabled,
  currentPartner,
  onStartChatting,
  toggleAudio,
  toggleVideo
}: VideoChatProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  // Generate user initials
  const getUserInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };
  
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden relative" id="partner-video-container">
      {/* Partner Video (Remote) */}
      <div className="bg-black w-full h-full flex items-center justify-center">
        {isConnected && remoteStream ? (
          <video
            ref={remoteVideoRef}
            className="max-h-full max-w-full"
            autoPlay
            playsInline
          />
        ) : (
          <div className="text-white text-center" id="no-partner-placeholder">
            <svg className="mx-auto h-16 w-16 mb-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-medium">Click "Start Chatting" to begin</h3>
            <p className="mt-2">You'll be connected with a random university student</p>
            
            <Button
              className="mt-6 bg-primary-600 hover:bg-primary-700 text-white"
              onClick={onStartChatting}
            >
              Start Chatting
            </Button>
          </div>
        )}
      </div>
      
      {/* Partner Info Overlay (Top) */}
      {isConnected && currentPartner && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-gray-900 to-transparent">
          <div className="flex items-center text-white">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center mr-3 text-sm">
              <span>{getUserInitials(currentPartner.username)}</span>
            </div>
            <div>
              <h3 className="font-medium">{currentPartner.university}</h3>
              <div className="flex items-center text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Self Video (Local) */}
      <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-white">
        {localStream ? (
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover transform scale-x-[-1]"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
            <span>Camera off</span>
          </div>
        )}
        
        {/* Controls Overlay */}
        <div className="absolute bottom-2 right-2 flex space-x-1.5">
          <button 
            className="bg-gray-800 bg-opacity-70 rounded-full p-1.5 text-white hover:bg-opacity-90 focus:outline-none" 
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
          </button>
          <button 
            className="bg-gray-800 bg-opacity-70 rounded-full p-1.5 text-white hover:bg-opacity-90 focus:outline-none" 
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
