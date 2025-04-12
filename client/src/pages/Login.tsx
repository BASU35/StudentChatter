import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Shield, Users, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid educational email").refine(
    (email) => {
      // Common educational domains
      const eduDomains = ['.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg', '.ac.za', 'dtu.ac.in'];
      return eduDomains.some(domain => email.toLowerCase().endsWith(domain));
    },
    { message: "Must be a valid educational email address (.edu or equivalent)" }
  ),
  university: z.string().min(3, "Please enter your university name"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      university: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/login", {
        email: values.email,
        password: values.password,
      });
      
      const userData = await res.json();
      
      // Check if email is verified
      if (res.status === 403 && userData.verified === false) {
        // Show verification alert
        setUnverifiedEmail(values.email);
        setShowVerificationAlert(true);
        toast({
          title: "Email not verified",
          description: "Please verify your email address before logging in.",
          variant: "destructive",
        });
        return;
      }

      // Save user data to localStorage if remember me is checked
      if (values.remember) {
        localStorage.setItem("user", JSON.stringify(userData));
      }

      // Call the onLogin callback
      onLogin(userData);

      toast({
        title: "Login successful",
        description: "Welcome back to Chatter Box!",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to resend verification email
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/send-verification", {
        email: unverifiedEmail,
      });
      
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to send verification email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register form submission
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // First verify the email is a valid educational email
      const verifyRes = await apiRequest("POST", "/api/verify-email", {
        email: values.email,
      });
      
      // If email verification passes, continue with registration
      const registerRes = await apiRequest("POST", "/api/register", {
        username: values.username,
        email: values.email,
        university: values.university,
        password: values.password,
      });
      
      const userData = await registerRes.json();
      
      // Show verification message
      setUnverifiedEmail(values.email);
      setShowVerificationAlert(true);
      
      toast({
        title: "Registration successful",
        description: "A verification email has been sent to your email address. Please verify your email to continue.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please check your form data and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-gray-50">
      {/* Email Verification Alert */}
      {showVerificationAlert && (
        <Alert className="mb-6 max-w-md">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div className="flex-1">
            <AlertTitle>Email verification required</AlertTitle>
            <AlertDescription className="mt-1">
              <p className="mb-2">
                Please check your email inbox ({unverifiedEmail}) and click the verification link to continue.
              </p>
              <div className="flex items-center mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="mr-2"
                >
                  {isLoading ? "Sending..." : "Resend verification email"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowVerificationAlert(false)}
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Chatter Box</h2>
          <p className="mt-2 text-sm text-gray-600">Connect with university students worldwide</p>
        </div>
        
        {/* Login/Register Tabs */}
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your.name@university.edu" 
                          {...field} 
                          type="email"
                          autoComplete="email"
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">Only university email addresses are accepted (.edu domains)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          {...field} 
                          type="password"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel>Remember me</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                      Forgot your password?
                    </a>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-sm">
                    Don't have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium text-primary-600"
                      onClick={() => setActiveTab("register")}
                    >
                      Sign up with your university email
                    </Button>
                  </p>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="register">
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="johndoe" 
                          {...field} 
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your.name@university.edu" 
                          {...field} 
                          type="email"
                          autoComplete="email"
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">Only university email addresses are accepted (.edu domains)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Stanford University" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          {...field} 
                          type="password"
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          {...field} 
                          type="password"
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-sm">
                    Already have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium text-primary-600"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </Button>
                  </p>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Features Section */}
      <div className="mt-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold text-gray-900">Why Chatter Box?</h3>
          <p className="mt-2 text-gray-600">A safe space made exclusively for university students</p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <Shield className="h-6 w-6 text-primary-600" />
              </div>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Verified Community</h4>
              <p className="mt-2 text-sm text-gray-500">Connect only with verified students from universities worldwide</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <MessageCircle className="h-6 w-6 text-primary-600" />
              </div>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Instant Connections</h4>
              <p className="mt-2 text-sm text-gray-500">Meet new friends, study partners, or just chat with fellow students</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h4 className="mt-4 text-lg font-medium text-gray-900">Safe Environment</h4>
              <p className="mt-2 text-sm text-gray-500">Enhanced moderation and reporting systems to ensure a respectful space</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="mt-16 w-full">
        <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-400">
            &copy; {new Date().getFullYear()} Chatter Box. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
