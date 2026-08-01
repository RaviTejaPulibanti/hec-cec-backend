import type { Request, Response } from "express";
import Question from "../models/questionModel.js";


export const createQuestion = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user?._id || req.user?.userId;

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


export const getQuestions = async (req: Request, res: Response) => {
  try {
    const questions = await Question.find();

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