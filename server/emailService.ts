import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { storage } from './storage';

// In-memory transporter for local development
let transporter: nodemailer.Transporter;

// Initialize email service with credentials
export function initEmailService() {
  // Create a test account if we're in development and don't have real credentials
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Email Service] Using test email account for development');
    
    // Create a transporter that captures emails instead of sending them
    // This is useful for development/testing
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'testuser',
        pass: process.env.EMAIL_PASS || 'testpass'
      }
    });
  } else {
    // Use real email credentials in production
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.error('[Email Service] Error connecting to mail server:', error);
    } else {
      console.log('[Email Service] Ready to send emails');
    }
  });
}

// Generate a secure verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate verification URL
export function getVerificationUrl(token: string, email: string): string {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
}

// Send verification email
export async function sendVerificationEmail(email: string): Promise<boolean> {
  try {
    // Generate token
    const token = generateVerificationToken();
    
    // Store token in the database with 24 hour expiry
    await storage.setVerificationToken(email, token, 24);
    
    // Get verification URL
    const verificationUrl = getVerificationUrl(token, email);
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Chatter Box" <noreply@chatterbox.com>',
      to: email,
      subject: 'Verify Your Email for Chatter Box',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Welcome to Chatter Box!</h2>
          <p>Thank you for registering with Chatter Box, the chat platform exclusively for college/university students.</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not sign up for a Chatter Box account, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Chatter Box. All rights reserved.</p>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Service] Verification email sent:', info.messageId);
    
    // For development, log preview URL if available (using Ethereal)
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('[Email Service] Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('[Email Service] Error sending verification email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  try {
    // Generate token
    const token = generateVerificationToken();
    
    // Store token in the database with 1 hour expiry
    await storage.setVerificationToken(email, token, 1);
    
    // Base URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Chatter Box" <noreply@chatterbox.com>',
      to: email,
      subject: 'Reset Your Chatter Box Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>We received a request to reset your Chatter Box password.</p>
          <p>Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Chatter Box. All rights reserved.</p>
        </div>
      `
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Service] Password reset email sent:', info.messageId);
    
    // For development, log preview URL if available (using Ethereal)
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('[Email Service] Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('[Email Service] Error sending password reset email:', error);
    return false;
  }
}