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
      .populate({
        path: "questions",
        select: "question options marks negativeMarks subject",
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or not available",
      });
    }

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

    const exam = await Exam.findById(
      req.params.examId as string
    ).populate("questions");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    const questions = exam.questions as any[];

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
      .populate("exam", "title subject duration")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
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