import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email...");
  
  // Extract token and email from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    
    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link. Missing required parameters.");
      return;
    }
    
    // Verify the token with the API
    const verifyToken = async () => {
      try {
        const response = await apiRequest("POST", "/api/verify-token", {
          token,
          email
        });
        
        if (response.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
        } else {
          const data = await response.json();
          setStatus("error");
          setMessage(data.message || "Failed to verify email. The link may be expired or invalid.");
        }
      } catch (error) {
        console.error("Error verifying email:", error);
        setStatus("error");
        setMessage("An error occurred while verifying your email. Please try again later.");
      }
    };
    
    verifyToken();
  }, []);
  
  // Request a new verification email
  const handleResendVerification = async () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    
    if (!email) {
      setMessage("Cannot resend verification email. Email address is missing.");
      return;
    }
    
    setStatus("loading");
    setMessage("Sending a new verification email...");
    
    try {
      const response = await apiRequest("POST", "/api/send-verification", {
        email
      });
      
      if (response.ok) {
        setStatus("success");
        setMessage("A new verification email has been sent to your inbox. Please check your email and click the verification link.");
      } else {
        const data = await response.json();
        setStatus("error");
        setMessage(data.message || "Failed to send verification email. Please try again later.");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setStatus("error");
      setMessage("An error occurred while sending the verification email. Please try again later.");
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-center text-2xl">
            {status === "loading" && "Verifying Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <div className="bg-red-50 p-4 rounded-md mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    The verification link may be expired or invalid. You can request a new verification email.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {status === "error" && (
            <Button 
              variant="default" 
              className="w-full" 
              onClick={handleResendVerification}
            >
              Resend Verification Email
            </Button>
          )}
          <Button 
            variant={status === "error" ? "outline" : "default"} 
            className="w-full" 
            onClick={() => setLocation("/")}
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}