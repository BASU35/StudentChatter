import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Email validation helpers
export function isEducationalEmail(email: string): boolean {
  // Common educational domains
  const eduDomains = ['.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg', '.ac.za', 'dtu.ac.in'];
  const emailLower = email.toLowerCase();
  
  return eduDomains.some(domain => emailLower.endsWith(domain));
}

// Format helper for timestamps
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Generate user initials from name
export function getUserInitials(name: string): string {
  if (!name) return "";
  
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

// Format time ago
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return `${interval} minutes ago`;
  }
  
  return seconds <= 5 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}
