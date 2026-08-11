import mongoose , { Schema, Document } from "mongoose";

export interface IExam extends Document {
  title: string;
  duration: number;
  totalQuestions: number;
  questions: mongoose.Types.ObjectId[];
  startTime: Date;
  endTime: Date;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  createdBy: mongoose.Types.ObjectId;
}

const examSchema = new Schema<IExam>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: Number,
      required: true,
    },

    totalQuestions: {
      type: Number,
      required: true,
    },

    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "COMPLETED"],
      default: "DRAFT",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IExam>("Exam", examSchema);