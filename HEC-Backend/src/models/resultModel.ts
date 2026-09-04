import mongoose, { Document, Schema } from "mongoose";

export interface IAnswer {
  question: mongoose.Types.ObjectId;
  selectedOption: number;
}

export interface IResult extends Document {
  student: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;

  answers: IAnswer[];

  score: number;
  totalMarks: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  timeTaken: number;

  submittedAt: Date;
}

const resultSchema = new Schema<IResult>(
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

    answers: [
      {
        question: {
          type: Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },

        selectedOption: {
          type: Number,
          required: true,
        },
      },
    ],

    score: {
      type: Number,
      default: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    wrongAnswers: {
      type: Number,
      default: 0,
    },

    unattempted: {
      type: Number,
      default: 0,
    },

    timeTaken: {
      type: Number,
      default: 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

resultSchema.index({ student: 1, exam: 1 }, { unique: true });

export default mongoose.model<IResult>("Result", resultSchema);