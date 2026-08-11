import type { Request, Response } from "express";
import mongoose from "mongoose";
import Exam from "../models/ExamModel.js";
import Result from "../models/resultModel.js";
import Question from "../models/questionModel.js";



export const getAvailableExams = async (
  req: Request,
  res: Response
) => {

   try {
    const now = new Date();

    const exams = await Exam.find({
      status: "PUBLISHED",
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select("-questions");

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }

};

export const getExamById = async (
  req: Request,
  res: Response
) => {
  try {
    const now = new Date();

    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam id",
      });
    }

    const exam = await Exam.findById(examId)
      .where({ status: "PUBLISHED", startTime: { $lte: now }, endTime: { $gte: now } })
      .lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or not available",
      });
    }

    const questions = await Question.find({ examId: exam._id }).select("question options marks negativeMarks");
    
    // Attach questions to the exam object
    (exam as any).questions = questions;

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const startExam = async (
  req: Request,
  res: Response
) => {
  try {
    const now = new Date();

    const exam = await Exam.findOne({
      _id: req.params.examId as string,
      status: "PUBLISHED",
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam is not available",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam started successfully",
      data: {
        examId: exam._id,
        title: exam.title,
        duration: exam.duration,
        startTime: now,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitExam = async (
  req: Request,
  res: Response
) => {
  try {

    const existingResult = await Result.  findOne({
     student: req.user._id as string,
     exam: req.params.examId as string,
});

if (existingResult) {
  return res.status(400).json({
    success: false,
    message: "You have already submitted this exam.",
  });
}
    const { answers } = req.body;

    const exam = await Exam.findById(req.params.examId as string);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const questions = await Question.find({ examId: exam._id });

    const now = Date.now();
    const examEndTime = new Date(exam.endTime).getTime();
    const gracePeriodMs = 2 * 60 * 1000; // 2 minutes grace period

    if (now > examEndTime + gracePeriodMs) {
      return res.status(400).json({
        success: false,
        message: "Exam submission rejected: Time window has closed.",
      });
    }

    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;



    for (const question of questions) {
      const submittedAnswer = answers.find(
        (answer: any) =>
          answer.question === question._id.toString()
      );

      if (!submittedAnswer) continue;

      if (
        submittedAnswer.selectedOption ===
        question.correctAnswer
      ) {
        correctAnswers++;
        score += question.marks;
      } else {
        wrongAnswers++;
        score -= question.negativeMarks;
      }
    }

    const unattempted =
      questions.length - (correctAnswers + wrongAnswers);

    const result = await Result.create({
      student: req.user._id,
      exam: exam._id,
      answers,
      score,
      correctAnswers,
      wrongAnswers,
      unattempted,
    });

    res.status(201).json({
      success: true,
      message: "Exam submitted successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyResults = async (
  req: Request,
  res: Response
) => {
  try {
    const results = await Result.find({
      student: req.user._id,
    })
      .populate("exam", "title duration")
      .sort({ createdAt: -1 })
      .lean();

    const resultsWithDetails = await Promise.all(
      results.map(async (result) => {
        if (!result.exam) {
          return {
            ...result,
            totalMarks: 0,
            exam: { title: "Deleted Exam", duration: 0 }
          };
        }

        // Calculate totalMarks dynamically
        const questions = await Question.find({ examId: result.exam._id });
        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        return {
          ...result,
          totalMarks,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: resultsWithDetails.length,
      data: resultsWithDetails,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getResultById = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await Result.findOne({
      _id: req.params.resultId as string,
      student: req.user._id,
    })
      .populate("exam", "title subject duration")
      .populate("answers.question", "question options");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};