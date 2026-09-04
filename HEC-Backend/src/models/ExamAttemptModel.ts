import mongoose, { Schema, Document } from "mongoose";

export interface IExamAttempt extends Document {
  student: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  startedAt: Date;
  status: "IN_PROGRESS" | "SUBMITTED";
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const examAttemptSchema = new Schema<IExamAttempt>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED"],
      default: "IN_PROGRESS",
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

examAttemptSchema.index({ student: 1, exam: 1 }, { unique: true });

export default mongoose.model<IExamAttempt>("ExamAttempt", examAttemptSchema);

