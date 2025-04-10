import { useState, useEffect, useRef } from 'react';

export function useMedia() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize media stream
  useEffect(() => {
    async function setupMediaStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera or microphone. Please check permissions.');
        
        // Try to get audio only if video fails
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          
          setLocalStream(audioStream);
          setIsVideoEnabled(false);
        } catch (audioErr) {
          console.error('Error accessing audio:', audioErr);
          setError('Could not access microphone. Chat functionality will be limited.');
        }
      }
    }
    
    setupMediaStream();
    
    // Clean up on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Toggle audio
  const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    const enabled = !isAudioEnabled;
    audioTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    setIsAudioEnabled(enabled);
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    const enabled = !isVideoEnabled;
    videoTracks.forEach(track => {
      track.enabled = enabled;
    });
    
    setIsVideoEnabled(enabled);
  };
  
  // Set remote stream
  const setRemoteMediaStream = (stream: MediaStream | null) => {
    setRemoteStream(stream);
  };
  
  return {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    error,
    toggleAudio,
    toggleVideo,
    setRemoteStream: setRemoteMediaStream
  };
}
