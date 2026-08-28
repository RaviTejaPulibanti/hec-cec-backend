import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  COLLEGE_ADMIN = "COLLEGE_ADMIN",
  STUDENT = "STUDENT",
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  idNumber?: string;
  branch?: string;
  year?: string;
  section?: string;
  studentClass?: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Hide password by default
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    idNumber: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      enum: ["CSE", "AIML", "ECE", "EEE", "CIVIL", "MECH"],
    },
    year: {
      type: String,
      enum: ["E1", "E2", "E3", "E4"],
    },
    section: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
    },
    studentClass: {
      type: String,
      enum: ["A", "B", "C", "D", "E"],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;