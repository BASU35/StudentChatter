import Peer, { DataConnection, MediaConnection } from 'peerjs';

// Store active peer connection
let peerInstance: Peer | null = null;
let mediaConnection: MediaConnection | null = null;
let dataConnection: DataConnection | null = null;

// Initialize a peer connection
export function initPeer(userId: string, onOpen?: () => void, onError?: (error: any) => void): Peer {
  // Clean up existing connections
  if (peerInstance) {
    cleanupPeer();
  }
  
  console.log('Initializing PeerJS with ID:', userId);
  
  // Create new peer connection with user ID as peer ID
  peerInstance = new Peer(userId, {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    },
    debug: 2
  });
  
  // Handle connection open
  peerInstance.on('open', (id) => {
    console.log('PeerJS connection established with ID:', id);
    if (onOpen) onOpen();
  });
  
  // Handle errors
  peerInstance.on('error', (err) => {
    console.error('PeerJS error:', err);
    if (onError) onError(err);
  });
  
  // Set up default call handler
  peerInstance.on('call', (call) => {
    console.log('Receiving call from:', call.peer);
    mediaConnection = call;
  });
  
  // Set up default data connection handler
  peerInstance.on('connection', (conn) => {
    console.log('Receiving data connection from:', conn.peer);
    dataConnection = conn;
    
    conn.on('data', (data) => {
      console.log('Received data:', data);
    });
  });
  
  return peerInstance;
}

// Call another peer
export function callPeer(
  peerId: string, 
  localStream: MediaStream | null, 
  onStream: (stream: MediaStream) => void,
  onClose?: () => void
): MediaConnection | null {
  if (!peerInstance) {
    console.error('Peer not initialized');
    return null;
  }
  
  if (!localStream) {
    console.error('No local stream available');
    return null;
  }
  
  console.log('Calling peer:', peerId);
  
  // Create a media connection
  mediaConnection = peerInstance.call(peerId, localStream);
  
  // Handle stream event
  mediaConnection.on('stream', (remoteStream) => {
    console.log('Received remote stream');
    onStream(remoteStream);
  });
  
  // Handle close event
  mediaConnection.on('close', () => {
    console.log('Media connection closed');
    if (onClose) onClose();
  });
  
  return mediaConnection;
}

// Answer an incoming call
export function answerCall(
  localStream: MediaStream | null, 
  onStream: (stream: MediaStream) => void
): boolean {
  if (!mediaConnection) {
    console.error('No incoming call to answer');
    return false;
  }
  
  if (!localStream) {
    console.error('No local stream available');
    return false;
  }
  
  console.log('Answering call from:', mediaConnection.peer);
  
  // Answer the call with our local stream
  mediaConnection.answer(localStream);
  
  // Handle stream event
  mediaConnection.on('stream', (remoteStream) => {
    console.log('Received remote stream');
    onStream(remoteStream);
  });
  
  return true;
}

// Send data to peer
export function sendData(data: any): boolean {
  if (!dataConnection) {
    console.error('No data connection established');
    return false;
  }
  
  console.log('Sending data:', data);
  dataConnection.send(data);
  return true;
}

// Connect to peer for data exchange
export function connectToPeer(
  peerId: string, 
  onData?: (data: any) => void,
  onOpen?: () => void,
  onClose?: () => void
): DataConnection | null {
  if (!peerInstance) {
    console.error('Peer not initialized');
    return null;
  }
  
  console.log('Connecting to peer for data:', peerId);
  
  // Create a data connection
  dataConnection = peerInstance.connect(peerId);
  
  // Handle connection open
  dataConnection.on('open', () => {
    console.log('Data connection established with:', peerId);
    if (onOpen) onOpen();
  });
  
  // Handle data event
  dataConnection.on('data', (data) => {
    console.log('Received data:', data);
    if (onData) onData(data);
  });
  
  // Handle close event
  dataConnection.on('close', () => {
    console.log('Data connection closed');
    if (onClose) onClose();
  });
  
  return dataConnection;
}

// Clean up peer connections
export function cleanupPeer(): void {
  if (mediaConnection) {
    mediaConnection.close();
    mediaConnection = null;
  }
  
  if (dataConnection) {
    dataConnection.close();
    dataConnection = null;
  }
  
  if (peerInstance) {
    peerInstance.destroy();
    peerInstance = null;
  }
}

// Update media stream
export function updateStream(stream: MediaStream | null): void {
  if (!mediaConnection) {
    console.warn('No active media connection to update');
    return;
  }
  
  // PeerJS doesn't have a direct method to update streams
  // We need to close the existing connection and create a new one
  const remotePeerId = mediaConnection.peer;
  mediaConnection.close();
  
  if (stream && peerInstance && remotePeerId) {
    console.log('Reestablishing call with updated stream');
    mediaConnection = peerInstance.call(remotePeerId, stream);
  }
}