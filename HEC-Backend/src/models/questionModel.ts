import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion extends Document {
  question: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  marks: number;
  negativeMarks: number;
  examId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const questionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length === 4,
        message: "A question must have exactly 4 options.",
      },
    },

    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },

    marks: {
      type: Number,
      default: 1,
    },

    negativeMarks: {
      type: Number,
      default: 0,
    },

    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
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

export default mongoose.model<IQuestion>("Question", questionSchema);