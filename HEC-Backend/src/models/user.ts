import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  COLLEGE_ADMIN = "COLLEGE_ADMIN",
  STUDENT = "STUDENT",
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;