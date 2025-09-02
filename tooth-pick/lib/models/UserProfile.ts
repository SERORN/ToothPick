// lib/models/UserProfile.ts - User Profile Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  preferences?: {
    notifications: boolean;
    privacy: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema: Schema = new Schema<IUserProfile>(
  {
    userId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String },
    location: { type: String },
    website: { type: String },
    socialLinks: {
      twitter: { type: String },
      linkedin: { type: String },
      instagram: { type: String },
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      privacy: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.UserProfile || 
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);