import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  loginSchema, 
  emailVerificationSchema, 
  insertReportSchema,
  verifyTokenSchema,
  resendVerificationSchema
} from "@shared/schema";
import { initEmailService, sendVerificationEmail } from "./emailService";
import { z } from "zod";
import * as crypto from "crypto";

// Define WebSocket client structure
interface SocketClient extends WebSocket {
  userId?: number;
  roomId?: string;
}

// Map of connected clients
const clients = new Map<number, SocketClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize email service
  (async () => {
    await initEmailService();
  })();
  
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // Handle WebSocket connections
  wss.on('connection', (ws: SocketClient) => {
    console.log('Client connected');
    let isAuthenticated = false;
    
    // Set a timeout to check authentication
    const authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log('Client disconnected: Authentication timeout');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required'
        }));
        ws.close();
      }
    }, 10000); // 10 seconds to authenticate

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received WebSocket message type:', data.type);
        
        if (data.type === 'auth') {
          await handleAuth(ws, data.userId);
          isAuthenticated = true;
          clearTimeout(authTimeout);
          console.log('Client authenticated:', data.userId);
          
          // Send successful authentication response
          ws.send(JSON.stringify({
            type: 'auth-success',
            user: await storage.getUser(data.userId)
          }));
          return;
        }
        
        // Require authentication for all other message types
        if (!isAuthenticated && ws.userId === undefined) {
          console.log('Unauthenticated request:', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication required'
          }));
          return;
        }
        
        switch (data.type) {
          case 'join-waiting':
            await handleJoinWaiting(ws, data.userId);
            break;
          case 'leave-waiting':
            await handleLeaveWaiting(ws, data.userId);
            break;
          case 'message':
            await handleMessage(ws, data);
            break;
          case 'signal':
            await handleSignal(ws, data);
            break;
          case 'next':
            await handleNext(ws, data.userId);
            break;
          case 'disconnect':
            await handleDisconnect(ws);
            break;
        }
      } catch (err) {
        console.error('Error handling message:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        await handleDisconnect(ws);
      }
    });
  });

  // User Authentication Routes
  app.post('/api/verify-email', async (req: Request, res: Response) => {
    try {
      const { email } = emailVerificationSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Email is valid for educational institution
      return res.status(200).json({ valid: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid email format or not from an educational institution' });
      }
      return res.status(500).json({ message: 'Server error during email verification' });
    }
  });

  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Verify email is an educational email
      try {
        emailVerificationSchema.parse({ email: userData.email });
      } catch (error) {
        return res.status(400).json({ message: 'Must use a valid educational email address' });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash password before storing
      const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Send verification email
      try {
        const emailSent = await sendVerificationEmail(userData.email);
        if (!emailSent) {
          console.error('Failed to send verification email to:', userData.email);
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Continue with registration even if email sending fails
      }
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(201).json({
        ...userWithoutPassword,
        message: 'Registration successful. Please check your email to verify your account.'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error during registration' });
    }
  });

  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(loginData.email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }
      
      // Verify password
      const hashedPassword = crypto.createHash('sha256').update(loginData.password).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }
      
      // Check if email is verified
      if (!user.isVerified) {
        return res.status(403).json({ 
          message: 'Email not verified. Please check your inbox for the verification link or request a new one.',
          verified: false 
        });
      }
      
      // Update user status to online
      await storage.updateUserOnlineStatus(user.id, true);
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error during login' });
    }
  });

  app.post('/api/logout', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Update user status to offline
      await storage.updateUserOnlineStatus(Number(userId), false);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: 'Server error during logout' });
    }
  });

  // Report User Route
  app.post('/api/report', async (req: Request, res: Response) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      
      const report = await storage.createReport(reportData);
      
      return res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid report data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error creating report' });
    }
  });

  // Email Verification Routes
  app.post('/api/send-verification', async (req: Request, res: Response) => {
    try {
      const { email } = resendVerificationSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already verified
      if (user.isVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }
      
      // Send verification email
      const emailSent = await sendVerificationEmail(email);
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
      
      return res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid email', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error sending verification email' });
    }
  });
  
  app.post('/api/verify-token', async (req: Request, res: Response) => {
    try {
      const { email, token } = verifyTokenSchema.parse(req.body);
      
      // Verify token
      const isValid = await storage.verifyUserEmail(email, token);
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }
      
      return res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid verification data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error verifying email' });
    }
  });
  
  // Email verification redirect endpoint
  app.get('/verify-email', async (req: Request, res: Response) => {
    try {
      const { token, email } = req.query;
      
      // Redirect to frontend verification page with the token and email
      return res.redirect(`/verify-email?token=${token}&email=${encodeURIComponent(String(email))}`);
    } catch (error) {
      console.error('Error in verification redirect:', error);
      return res.redirect(`/verify-email?error=1`);
    }
  });

  // User Profile Route
  app.get('/api/user/:id', async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: 'Server error retrieving user' });
    }
  });

  return httpServer;
}

// WebSocket handler functions
async function handleAuth(ws: SocketClient, userId: number) {
  const user = await storage.getUser(userId);
  
  if (!user) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication failed: User not found'
    }));
    return;
  }
  
  // Check if email is verified
  if (!user.isVerified) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Email not verified. Please verify your email before using the chat.'
    }));
    return;
  }
  
  // Set userId on websocket client
  ws.userId = userId;
  clients.set(userId, ws);
  
  // Update user status
  await storage.updateUserOnlineStatus(userId, true);
  
  // Auth success response is now sent in the message handler
}

async function handleJoinWaiting(ws: SocketClient, userId: number) {
  if (!ws.userId || ws.userId !== userId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication required'
    }));
    return;
  }
  
  // Add user to waiting pool
  await storage.addToWaitingPool(userId);
  
  // Try to find a match
  const waitingUsers = await storage.getWaitingUsers();
  const availableUsers = waitingUsers.filter(id => id !== userId);
  
  if (availableUsers.length > 0) {
    // Find a random user to match with
    const partnerIndex = Math.floor(Math.random() * availableUsers.length);
    const partnerId = availableUsers[partnerIndex];
    
    await matchUsers(userId, partnerId);
  } else {
    // No match found, notify user they're in queue
    ws.send(JSON.stringify({
      type: 'waiting',
      message: 'Waiting for a match'
    }));
  }
}

async function handleLeaveWaiting(ws: SocketClient, userId: number) {
  if (!ws.userId || ws.userId !== userId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication required'
    }));
    return;
  }
  
  // Remove user from waiting pool
  await storage.removeFromWaitingPool(userId);
  
  ws.send(JSON.stringify({
    type: 'leave-waiting-success'
  }));
}

async function matchUsers(userId1: number, userId2: number) {
  // Remove both users from waiting pool
  await storage.removeFromWaitingPool(userId1);
  await storage.removeFromWaitingPool(userId2);
  
  // Create a new room
  const room = await storage.createRoom(userId1, userId2);
  
  // Get user details
  const user1 = await storage.getUser(userId1);
  const user2 = await storage.getUser(userId2);
  
  if (!user1 || !user2) {
    console.error('Failed to match users: One or both users not found');
    return;
  }
  
  // Get client websockets
  const client1 = clients.get(userId1);
  const client2 = clients.get(userId2);
  
  if (!client1 || !client2) {
    console.error('Failed to match users: One or both clients disconnected');
    return;
  }
  
  // Set room ID on both clients
  client1.roomId = room.id;
  client2.roomId = room.id;
  
  // Notify both users of the match
  client1.send(JSON.stringify({
    type: 'match',
    roomId: room.id,
    partner: {
      id: user2.id,
      username: user2.username,
      university: user2.university
    }
  }));
  
  client2.send(JSON.stringify({
    type: 'match',
    roomId: room.id,
    partner: {
      id: user1.id,
      username: user1.username,
      university: user1.university
    }
  }));
}

async function handleMessage(ws: SocketClient, data: any) {
  const { userId, roomId, message } = data;
  
  if (!ws.userId || ws.userId !== userId || !ws.roomId || ws.roomId !== roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid user or room'
    }));
    return;
  }
  
  // Get room
  const room = await storage.getRoomById(roomId);
  if (!room || !room.active) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found or inactive'
    }));
    return;
  }
  
  // Find partner
  const partnerId = room.participants.find(id => id !== userId);
  if (!partnerId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Partner not found'
    }));
    return;
  }
  
  // Create message
  const newMessage = await storage.createMessage(userId, partnerId, message);
  
  // Get partner client
  const partnerClient = clients.get(partnerId);
  
  // Send message to both sender and partner
  ws.send(JSON.stringify({
    type: 'message',
    message: newMessage
  }));
  
  if (partnerClient && partnerClient.readyState === WebSocket.OPEN) {
    partnerClient.send(JSON.stringify({
      type: 'message',
      message: newMessage
    }));
  }
}

async function handleSignal(ws: SocketClient, data: any) {
  const { userId, roomId, signal } = data;
  
  if (!ws.userId || ws.userId !== userId || !ws.roomId || ws.roomId !== roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid user or room'
    }));
    return;
  }
  
  // Get room
  const room = await storage.getRoomById(roomId);
  if (!room || !room.active) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found or inactive'
    }));
    return;
  }
  
  // Find partner
  const partnerId = room.participants.find(id => id !== userId);
  if (!partnerId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Partner not found'
    }));
    return;
  }
  
  // Get partner client
  const partnerClient = clients.get(partnerId);
  
  // Forward signal to partner
  if (partnerClient && partnerClient.readyState === WebSocket.OPEN) {
    partnerClient.send(JSON.stringify({
      type: 'signal',
      userId,
      signal
    }));
  }
}

async function handleNext(ws: SocketClient, userId: number) {
  if (!ws.userId || ws.userId !== userId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication required'
    }));
    return;
  }
  
  // Check if user is in a room
  if (ws.roomId) {
    // Close current room
    await storage.closeRoom(ws.roomId);
    
    // Get room
    const room = await storage.getRoomById(ws.roomId);
    if (room) {
      // Notify partner of disconnection
      const partnerId = room.participants.find(id => id !== userId);
      if (partnerId) {
        const partnerClient = clients.get(partnerId);
        if (partnerClient && partnerClient.readyState === WebSocket.OPEN) {
          partnerClient.send(JSON.stringify({
            type: 'partner-left'
          }));
          
          // Clear room ID from partner
          partnerClient.roomId = undefined;
        }
      }
    }
    
    // Clear room ID
    ws.roomId = undefined;
  }
  
  // Join waiting pool to find new match
  await handleJoinWaiting(ws, userId);
}

async function handleDisconnect(ws: SocketClient) {
  if (!ws.userId) return;
  
  // Update user status
  await storage.updateUserOnlineStatus(ws.userId, false);
  
  // Remove from waiting pool
  await storage.removeFromWaitingPool(ws.userId);
  
  // Check if user is in a room
  if (ws.roomId) {
    // Close room
    await storage.closeRoom(ws.roomId);
    
    // Get room
    const room = await storage.getRoomById(ws.roomId);
    if (room) {
      // Notify partner of disconnection
      const partnerId = room.participants.find(id => id !== ws.userId);
      if (partnerId) {
        const partnerClient = clients.get(partnerId);
        if (partnerClient && partnerClient.readyState === WebSocket.OPEN) {
          partnerClient.send(JSON.stringify({
            type: 'partner-left'
          }));
          
          // Clear room ID from partner
          partnerClient.roomId = undefined;
        }
      }
    }
  }
  
  // Remove client from map
  clients.delete(ws.userId);
}
