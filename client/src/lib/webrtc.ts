import Peer from 'simple-peer';

// Track active peer connections
const peerConnections = new Map();

// Set up a WebRTC peer connection
export function setupPeerConnection(
  socket: WebSocket,
  roomId: string,
  userId: number,
  stream: MediaStream | null,
  onStream: (stream: MediaStream) => void,
  initiator: boolean = false
) {
  console.log('Setting up peer connection for room:', roomId, 'as initiator:', initiator);
  
  // Close any existing peer connection for this room
  if (peerConnections.has(roomId)) {
    closePeerConnection(peerConnections.get(roomId));
  }
  
  // Create new peer connection
  const peer = new Peer({
    initiator,
    trickle: false,
    stream: stream || undefined,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  });
  
  // Store the roomId and userId with the peer for reference
  peer.roomId = roomId;
  peer.userId = userId;
  
  // Handle signal event (when peer connection generates a signal)
  peer.on('signal', (data) => {
    console.log('WebRTC signal generated:', data.type);
    // Send signal to server to forward to peer
    socket.send(JSON.stringify({
      type: 'signal',
      userId,
      roomId,
      signal: data
    }));
  });
  
  // Handle stream event (when peer shares their stream)
  peer.on('stream', (remoteStream) => {
    console.log('Remote stream received');
    onStream(remoteStream);
  });
  
  // Handle connect event (when peer connection is established)
  peer.on('connect', () => {
    console.log('WebRTC peer connection established!');
  });
  
  // Handle error event
  peer.on('error', (err) => {
    console.error('Peer connection error:', err);
  });
  
  // Set up message handler for signals from peer
  const handleSignal = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'signal' && data.userId !== userId) {
        console.log('Received signal from peer:', data.signal.type);
        peer.signal(data.signal);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };
  
  // Add message listener to socket
  socket.addEventListener('message', handleSignal);
  
  // Store peer connection
  peer._socketCleanup = () => {
    socket.removeEventListener('message', handleSignal);
  };
  
  peerConnections.set(roomId, peer);
  
  return peer;
}

// Close a peer connection
export function closePeerConnection(peer: any) {
  if (!peer) return;
  
  try {
    console.log('Closing peer connection');
    
    // Clean up socket listener
    if (typeof peer._socketCleanup === 'function') {
      peer._socketCleanup();
    }
    
    // Destroy peer connection
    peer.destroy();
    
    // Remove from connections map
    if (peer.roomId) {
      peerConnections.delete(peer.roomId);
    }
  } catch (error) {
    console.error('Error closing peer connection:', error);
  }
}

// Update peer connection with new media stream
export function updatePeerStream(peer: any, stream: MediaStream | null) {
  if (!peer) return;
  
  try {
    console.log('Updating peer stream');
    
    // Remove all existing tracks
    if (peer._localStreams && peer._localStreams.length > 0) {
      const senders = peer._localStreams[0].getTracks();
      senders.forEach((track: MediaStreamTrack) => {
        track.stop();
      });
    }
    
    // Add new tracks if stream is provided
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        peer.addTrack(track, stream);
      });
    }
  } catch (error) {
    console.error('Error updating peer stream:', error);
  }
}
