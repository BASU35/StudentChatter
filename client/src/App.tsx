import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import ChatRoom from "@/pages/ChatRoom";
import { useEffect, useState } from "react";
import ReportModal from "@/components/ReportModal";

function Router() {
  const [location] = useLocation();
  const [user, setUser] = useState<any>(null);

  // Check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Protected route logic
  useEffect(() => {
    if (!user && location !== "/") {
      window.location.href = "/";
    }
  }, [user, location]);

  return (
    <Switch>
      <Route path="/" component={() => 
        user ? <ChatRoom user={user} onLogout={() => {
          localStorage.removeItem("user");
          setUser(null);
        }} /> : <Login onLogin={setUser} />
      } />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
