import type { Request, Response } from "express";
import Question from "../models/questionModel.js";
import Exam from "../models/ExamModel.js";


export const createQuestion = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user?._id || req.user?.userId;

    const exam = await Exam.findById(req.body.examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const questionCount = await Question.countDocuments({ examId: exam._id });
    if (questionCount >= exam.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Maximum number of questions (${exam.totalQuestions}) reached for this exam.`,
      });
    }

    const question = await Question.create({
      ...req.body,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: question,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const bulkCreateQuestions = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user?._id || req.user?.userId;
    const { examId, questions } = req.body;

    if (!examId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examId and a non-empty questions array are required",
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const existingCount = await Question.countDocuments({ examId: exam._id });
    if (existingCount + questions.length > exam.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Adding ${questions.length} questions exceeds the maximum limit of ${exam.totalQuestions}. Current count: ${existingCount}.`,
      });
    }

    const questionsToInsert = questions.map((q: any) => ({
      ...q,
      examId: exam._id,
      createdBy,
    }));

    const insertedQuestions = await Question.insertMany(questionsToInsert);

    res.status(201).json({
      success: true,
      message: `${insertedQuestions.length} questions uploaded successfully`,
      data: insertedQuestions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getQuestions = async (req: Request, res: Response) => {
  try {
    const questions = await Question.find().populate("examId", "title");

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getQuestion = async (req: Request, res: Response) => {
  try {
    const question = await Question.findById(req.params.id).populate("examId", "title");

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: question,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};