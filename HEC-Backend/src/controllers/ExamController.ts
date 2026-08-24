import Exam from "../models/ExamModel.js";
import Question from "../models/questionModel.js";
import Result from "../models/resultModel.js";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const getExamDateBounds = (examDate: unknown, endDate: unknown) => {
  if (
    typeof examDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(examDate) ||
    typeof endDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return null;
  }

  const startTime = new Date(`${examDate}T00:00:00.000Z`);
  const endTime = new Date(`${endDate}T23:59:59.999Z`);
  if (
    Number.isNaN(startTime.getTime()) ||
    Number.isNaN(endTime.getTime()) ||
    startTime.toISOString().slice(0, 10) !== examDate ||
    endTime.toISOString().slice(0, 10) !== endDate ||
    endTime < startTime
  ) {
    return null;
  }

  return {
    startTime,
    endTime,
  };
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const { securityCode, examDate, endDate, questions, ...examData } = req.body;
    const dateBounds = getExamDateBounds(examDate, endDate);
    if (!dateBounds) {
      return res.status(400).json({
        success: false,
        message: "Valid start and end dates are required, and the end date cannot be before the start date",
      });
    }

    if (!Array.isArray(questions) || questions.length !== Number(examData.totalQuestions)) {
      return res.status(400).json({
        success: false,
        message: `Exactly ${examData.totalQuestions} questions are required`,
      });
    }

    const securityCodeHash = securityCode ? await bcrypt.hash(securityCode, 10) : undefined;
    const newExam = new Exam({
     ...examData,
      examDate,
      endDate,
      ...dateBounds,
      securityCodeHash,
      createdBy: req.user?._id || req.user?.userId,
    });

    await newExam.save();

    try {
      const createdQuestions = await Question.insertMany(
        questions.map((question: Record<string, unknown>) => ({
          ...question,
          examId: newExam._id,
          createdBy: req.user?._id || req.user?.userId,
        }))
      );
      newExam.questions = createdQuestions.map((question) => question._id);
      await newExam.save();
    } catch (questionError) {
      await Exam.deleteOne({ _id: newExam._id });
      throw questionError;
    }

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
    const { securityCode, examDate, endDate, ...examData } = req.body;
    const dateBounds = getExamDateBounds(examDate, endDate);
    if (!dateBounds) {
      return res.status(400).json({
        success: false,
        message: "Valid start and end dates are required, and the end date cannot be before the start date",
      });
    }

    const updateData = securityCode
      ? { ...examData, examDate, endDate, ...dateBounds, securityCodeHash: await bcrypt.hash(securityCode, 10) }
      : { ...examData, examDate, endDate, ...dateBounds };
    let exam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
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

    
    if (exam.status === "COMPLETED" && new Date(exam.endTime).getTime() > Date.now()) {
      exam.status = "PUBLISHED";
      await exam.save();
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