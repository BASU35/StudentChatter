import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";
import { useMedia } from "@/hooks/use-media";
import VideoChat from "@/components/VideoChat";
import ChatSidebar from "@/components/ChatSidebar";
import ReportModal from "@/components/ReportModal";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mic, MicOff, Video, VideoOff, User, AlertTriangle, LogOut } from "lucide-react";
import { initPeer, callPeer, answerCall, cleanupPeer, sendData, connectToPeer } from "@/lib/peerConnection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatRoomProps {
  user: any;
  onLogout: () => void;
}

export default function ChatRoom({ user, onLogout }: ChatRoomProps) {
  const { toast } = useToast();
  const { socket, socketStatus } = useSocket();
  const { localStream, remoteStream, isAudioEnabled, isVideoEnabled, toggleAudio, toggleVideo, setRemoteStream } = useMedia();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [currentPartner, setCurrentPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [peerConnection, setPeerConnection] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Start chatting
  const startChatting = async () => {
    if (!socket || socketStatus !== "connected") {
      toast({
        title: "Connection error",
        description: "Unable to connect to the chat server. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Clear any existing chat
    setMessages([]);
    setCurrentPartner(null);
    
    // Clean up any existing peer connections
    cleanupPeer();
    
    setIsConnecting(true);
    
    // Authenticate with WebSocket
    socket.send(JSON.stringify({
      type: "auth",
      userId: user.id
    }));
    
    // Join waiting pool
    socket.send(JSON.stringify({
      type: "join-waiting",
      userId: user.id
    }));
  };
  
  // Find a new chat partner
  const findNewPartner = () => {
    if (!socket || socketStatus !== "connected") {
      toast({
        title: "Connection error",
        description: "Unable to connect to the chat server. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Clean up any existing peer connections
    cleanupPeer();
    
    setIsConnecting(true);
    setIsConnected(false);
    setCurrentPartner(null);
    setMessages([]);
    
    // Send next command to find new partner
    socket.send(JSON.stringify({
      type: "next",
      userId: user.id
    }));
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Clean up any existing peer connections
      cleanupPeer();
      
      // Send disconnect message to server
      if (socket && socketStatus === "connected") {
        socket.send(JSON.stringify({
          type: "disconnect",
          userId: user.id
        }));
      }
      
      // Call API to update user status
      await apiRequest("POST", "/api/logout", { userId: user.id });
      
      // Call logout callback
      onLogout();
    } catch (error) {
      console.error("Logout error:", error);
      onLogout(); // Still logout the user even if API call fails
    }
  };
  
  // Toggle chat sidebar
  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };
  
  // Report user
  const reportUser = () => {
    if (!currentPartner) {
      toast({
        title: "Cannot report",
        description: "You are not connected to a user to report.",
        variant: "default",
      });
      return;
    }
    
    setIsReportModalOpen(true);
  };
  
  // Initialize PeerJS when user logs in
  useEffect(() => {
    if (user && user.id) {
      // Initialize PeerJS with user ID
      const peer = initPeer(user.id.toString(), 
        () => {
          console.log("PeerJS connection initialized");
        },
        (error) => {
          console.error("PeerJS error:", error);
          toast({
            title: "Video connection error",
            description: "Unable to initialize video chat. Please check your permissions.",
            variant: "destructive",
          });
        }
      );
      
      setPeerConnection(peer);
      
      return () => {
        cleanupPeer();
      };
    }
  }, [user, toast]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "auth-success":
            console.log("Authentication successful", data.user);
            break;
            
          case "waiting":
            // Already handled by setting isConnecting to true
            break;
            
          case "match":
            setIsConnecting(false);
            setIsConnected(true);
            setCurrentPartner(data.partner);
            
            // Add system message
            setMessages(prev => [
              ...prev,
              {
                id: "system-connected",
                type: "system",
                text: `You are now connected with a student from ${data.partner.university}`,
                timestamp: new Date()
              }
            ]);
            
            // Establish WebRTC connection with partner
            if (localStream && peerConnection) {
              // Call the partner using their user ID
              const mediaConn = callPeer(
                data.partner.id.toString(),
                localStream,
                (newRemoteStream) => {
                  // Update the remote stream with the received stream
                  setRemoteStream(newRemoteStream);
                }
              );
              
              // Set up data connection for direct messaging
              const dataConn = connectToPeer(
                data.partner.id.toString(),
                (messageData) => {
                  if (messageData?.text) {
                    // Add direct message to chat
                    setMessages(prev => [...prev, {
                      id: new Date().getTime().toString(),
                      senderId: data.partner.id,
                      text: messageData.text,
                      timestamp: new Date()
                    }]);
                  }
                }
              );
            }
            break;
            
          case "message":
            // Add message to chat
            setMessages(prev => [...prev, data.message]);
            break;
            
          case "partner-left":
            setIsConnected(false);
            setCurrentPartner(null);
            
            // Add system message
            setMessages(prev => [
              ...prev,
              {
                id: "system-disconnected",
                type: "system",
                text: "Your chat partner has disconnected",
                timestamp: new Date()
              }
            ]);
            
            // Clean up peer connections
            cleanupPeer();
            
            toast({
              title: "Partner disconnected",
              description: "Your chat partner has left the conversation.",
              variant: "default",
            });
            break;
            
          case "error":
            console.error("WebSocket error:", data.message);
            toast({
              title: "Connection error",
              description: data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socket.addEventListener("message", handleMessage);
    
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, user, localStream, peerConnection, toast]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupPeer();
    };
  }, []);
  
  // Send message
  const sendMessage = (messageText: string) => {
    if (!socket || !isConnected || !currentPartner) return;
    
    socket.send(JSON.stringify({
      type: "message",
      userId: user.id,
      roomId: peerConnection?.roomId,
      message: messageText
    }));
  };
  
  // Handle form submission for report
  const handleSubmitReport = async (reportData: any) => {
    if (!currentPartner) return;
    
    try {
      await apiRequest("POST", "/api/report", {
        reporterId: user.id,
        reportedId: currentPartner.id,
        reason: reportData.reason,
        details: reportData.details
      });
      
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep Chatter Box safe!",
        variant: "default",
      });
      
      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Report failed",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Generate user initials
  const getUserInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <MessageCircle className="h-5 w-5 text-primary-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Chatter Box</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
                Connected
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    <span>{getUserInitials(user.username)}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={true} className="font-semibold">
                  <User className="mr-2 h-4 w-4" />
                  <span>{user.username}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={true} className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Main Chat Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Video Container */}
        <div className="w-full lg:w-3/4 flex flex-col bg-gray-900 relative">
          {/* Connection Overlay */}
          {isConnecting && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                <p className="mt-4 text-lg">Connecting to a random student...</p>
              </div>
            </div>
          )}
          
          <VideoChat
            localStream={localStream}
            remoteStream={remoteStream}
            isConnected={isConnected}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            currentPartner={currentPartner}
            onStartChatting={startChatting}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
          />
          
          {/* Action Bar */}
          <div className="bg-gray-800 py-4 px-6 flex justify-center space-x-6">
            <button 
              className="flex flex-col items-center text-white opacity-80 hover:opacity-100 focus:outline-none transition-opacity"
              onClick={toggleAudio}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center mb-1">
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </div>
              <span className="text-xs">{isAudioEnabled ? "Mute" : "Unmute"}</span>
            </button>
            
            <button 
              className="flex flex-col items-center text-white opacity-80 hover:opacity-100 focus:outline-none transition-opacity"
              onClick={toggleChat}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center mb-1">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-xs">Chat</span>
            </button>
            
            <button
              className="flex flex-col items-center text-white bg-secondary-500 rounded-full px-6 py-2 hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 transition-colors"
              onClick={findNewPartner}
            >
              <span className="font-medium">Next</span>
            </button>
            
            <button 
              className="flex flex-col items-center text-white opacity-80 hover:opacity-100 focus:outline-none transition-opacity"
              onClick={reportUser}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center mb-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-xs">Report</span>
            </button>
          </div>
        </div>
        
        {/* Chat Sidebar */}
        {isChatOpen && (
          <ChatSidebar
            messages={messages}
            currentUser={user}
            currentPartner={currentPartner}
            onSendMessage={sendMessage}
          />
        )}
      </main>
      
      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}
