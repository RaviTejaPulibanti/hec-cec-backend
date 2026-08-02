import Exam from "../models/ExamModel.js";
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
    const exams = await Exam.find().populate("createdBy" , "name email").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams,
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

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
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