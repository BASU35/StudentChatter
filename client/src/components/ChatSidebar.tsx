import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal } from "lucide-react";

interface ChatSidebarProps {
  messages: any[];
  currentUser: any;
  currentPartner: any;
  onSendMessage: (message: string) => void;
}

export default function ChatSidebar({ messages, currentUser, currentPartner, onSendMessage }: ChatSidebarProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Handle message form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    
    onSendMessage(messageInput.trim());
    setMessageInput("");
  };
  
  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    if (!timestamp) return "";
    
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  
  return (
    <div className="hidden lg:flex lg:w-1/4 border-l border-gray-200 flex-col bg-white">
      <div className="py-4 px-5 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Chat</h2>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4" id="messages-container">
        {messages.map((message, index) => {
          if (message.type === "system") {
            // System Message
            return (
              <div key={message.id || index} className="mb-4 flex justify-center">
                <div className="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-500">
                  {message.text}
                </div>
              </div>
            );
          } else if (message.senderId === currentUser.id) {
            // Self Message
            return (
              <div key={message.id || index} className="mb-4 ml-auto max-w-xs">
                <div className="flex items-end justify-end">
                  <div className="bg-primary-100 rounded-lg px-4 py-2 text-sm text-primary-800">
                    <p>{message.text}</p>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 text-right pr-2">
                  You · {formatTime(message.timestamp)}
                </div>
              </div>
            );
          } else {
            // Partner Message
            return (
              <div key={message.id || index} className="mb-4 max-w-xs">
                <div className="flex items-end">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800">
                    <p>{message.text}</p>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 pl-2">
                  {currentPartner?.username || "Partner"} · {formatTime(message.timestamp)}
                </div>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!currentPartner}
          />
          <Button
            type="submit"
            className="bg-primary-600 text-white py-2 px-4 rounded-r-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            disabled={!messageInput.trim() || !currentPartner}
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
