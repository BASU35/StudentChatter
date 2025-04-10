import { useState, useEffect, useRef } from 'react';

type SocketStatus = 'disconnected' | 'connecting' | 'connected';

export function useSocket() {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Make sure to use the browser's built-in WebSocket
    if (typeof WebSocket === 'undefined') {
      console.error('WebSocket is not supported in this browser');
      return;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      setSocketStatus('connecting');
      
      // Connection opened
      socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        setSocketStatus('connected');
      });
      
      // Connection error
      socket.addEventListener('error', (error) => {
        console.error('WebSocket connection error:', error);
      });
      
      // Connection closed
      socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed:', event);
        setSocketStatus('disconnected');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (socketRef.current?.readyState === WebSocket.CLOSED) {
            console.log('Attempting to reconnect WebSocket...');
            // Only create a new connection if we're still mounted and connection is closed
            const newSocket = new WebSocket(wsUrl);
            socketRef.current = newSocket;
            
            setSocketStatus('connecting');
            
            newSocket.addEventListener('open', () => {
              console.log('WebSocket reconnection established');
              setSocketStatus('connected');
            });
            
            newSocket.addEventListener('error', (error) => {
              console.error('WebSocket reconnection error:', error);
            });
            
            newSocket.addEventListener('close', () => {
              console.log('WebSocket reconnection closed');
              setSocketStatus('disconnected');
            });
          }
        }, 3000);
      });
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        console.log('Closing WebSocket connection');
        socketRef.current.close();
      }
    };
  }, []);
  
  return {
    socket: socketRef.current,
    socketStatus,
  };
}
