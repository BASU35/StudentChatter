import { 
  users, type User, type InsertUser,
  reports, type Report, type InsertReport,
  type Message, type ChatRoom
} from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<Report[]>;
  
  // Chat operations
  createMessage(senderId: number, receiverId: number, text: string): Promise<Message>;
  getMessagesForRoom(roomId: string): Promise<Message[]>;
  
  // Room operations
  createRoom(userId1: number, userId2: number): Promise<ChatRoom>;
  getRoomByParticipant(userId: number): Promise<ChatRoom | undefined>;
  getRoomById(roomId: string): Promise<ChatRoom | undefined>;
  closeRoom(roomId: string): Promise<void>;
  
  // Matching
  getWaitingUsers(): Promise<number[]>;
  addToWaitingPool(userId: number): Promise<void>;
  removeFromWaitingPool(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private reports: Map<number, Report>;
  private messages: Message[];
  private rooms: Map<string, ChatRoom>;
  private waitingPool: Set<number>;
  
  currentUserId: number;
  currentReportId: number;

  constructor() {
    this.users = new Map();
    this.reports = new Map();
    this.messages = [];
    this.rooms = new Map();
    this.waitingPool = new Set();
    
    this.currentUserId = 1;
    this.currentReportId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      isOnline: false,
      lastActive: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastActive = new Date();
      this.users.set(id, user);
    }
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const id = this.currentReportId++;
    const newReport: Report = {
      ...report,
      id,
      timestamp: new Date()
    };
    this.reports.set(id, newReport);
    return newReport;
  }

  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }

  // Message operations
  async createMessage(senderId: number, receiverId: number, text: string): Promise<Message> {
    const message: Message = {
      id: nanoid(),
      senderId,
      receiverId,
      text,
      timestamp: new Date()
    };
    this.messages.push(message);
    return message;
  }

  async getMessagesForRoom(roomId: string): Promise<Message[]> {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    const [user1, user2] = room.participants;
    return this.messages.filter(message => 
      (message.senderId === user1 && message.receiverId === user2) ||
      (message.senderId === user2 && message.receiverId === user1)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Room operations
  async createRoom(userId1: number, userId2: number): Promise<ChatRoom> {
    // Close any existing rooms for these users
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.includes(userId1) || room.participants.includes(userId2)) {
        await this.closeRoom(roomId);
      }
    }
    
    const room: ChatRoom = {
      id: nanoid(),
      participants: [userId1, userId2],
      createdAt: new Date(),
      active: true
    };
    
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoomByParticipant(userId: number): Promise<ChatRoom | undefined> {
    return Array.from(this.rooms.values()).find(
      room => room.active && room.participants.includes(userId)
    );
  }

  async getRoomById(roomId: string): Promise<ChatRoom | undefined> {
    return this.rooms.get(roomId);
  }

  async closeRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.active = false;
      this.rooms.set(roomId, room);
    }
  }

  // Matching operations
  async getWaitingUsers(): Promise<number[]> {
    return Array.from(this.waitingPool);
  }

  async addToWaitingPool(userId: number): Promise<void> {
    this.waitingPool.add(userId);
  }

  async removeFromWaitingPool(userId: number): Promise<void> {
    this.waitingPool.delete(userId);
  }
}

export const storage = new MemStorage();
