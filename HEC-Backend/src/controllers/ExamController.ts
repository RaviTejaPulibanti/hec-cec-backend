import Exam from "../models/ExamModel.js";
import Question from "../models/questionModel.js";
import Result from "../models/resultModel.js";
import type { Request, Response } from "express";

import mongoose from "mongoose";

export const createExam = async (req: Request, res: Response) => {
  try {
    const newExam = new Exam({
     ...req.body,
      createdBy: req.user?._id || req.user?.userId,
    });

    await newExam.save();

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: newExam,
    });

  }catch(err){
    return res.status(500).json({
      success: false,
      message: "Error creating exam",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export const getExams = async (req: Request, res: Response) => {
  try {
    const exams = await Exam.find().populate("createdBy" , "name email").sort({ createdAt: -1 }).lean();

    const examsWithCount = await Promise.all(
      exams.map(async (exam) => {
        const questionCount = await Question.countDocuments({ examId: exam._id });
        return {
          ...exam,
          questionCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: examsWithCount.length,
      data: examsWithCount,
    });

  }catch(err){
    return res.status(500).json({
      success: false,
      message: "Error fetching exams",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
} 

export const getExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("questions");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
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

export const updateExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Delete all questions that belong to this exam
    // We use the exam's _id since questions store the exam ID in their 'examId' field
    await Question.deleteMany({ examId: exam._id });

    // Additionally, if there are questions in the array just in case
    if (exam.questions && exam.questions.length > 0) {
      await Question.deleteMany({ _id: { $in: exam.questions } });
    }

    // Delete all results submitted for this exam
    await Result.deleteMany({ exam: exam._id });

    res.status(200).json({
      success: true,
      message: "Exam and all related questions and results deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addQuestionsToExam = async (
  req: Request,
  res: Response
) => {
  try {
    const { questionIds } = req.body;

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: {
          questions: {
            $each: questionIds,
          },
        },
      },
      {
        new: true,
      }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.totalQuestions = exam.questions.length;

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Questions added successfully",
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeQuestionFromExam = async (
  req: Request,
  res: Response
) => {
  try {
    const { examId, questionId } = req.params;

    const exam = await Exam.findByIdAndUpdate(
      examId,
      {
        $pull: {
          questions: questionId,
        },
      },
      {
        new: true,
      }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.totalQuestions = exam.questions.length;

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Question removed successfully",
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const publishExam = async (
  req: Request,
  res: Response
) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const questionCount = await Question.countDocuments({ examId: exam._id });

    if (questionCount !== exam.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Cannot publish: Exam requires exactly ${exam.totalQuestions} questions, but currently has ${questionCount}.`,
      });
    }

    exam.status = "PUBLISHED";

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam published successfully",
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const unpublishExam = async (
  req: Request,
  res: Response
) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "PUBLISHED") {
      return res.status(400).json({
        success: false,
        message: "Exam is not published.",
      });
    }

    exam.status = "DRAFT";
    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam unpublished successfully",
      data: exam,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};