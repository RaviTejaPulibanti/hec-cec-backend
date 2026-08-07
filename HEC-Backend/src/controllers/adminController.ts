import type{ Request, Response } from "express";

import Result from "../models/resultModel.js";
import User , {UserRole } from "../models/user.js";
import Exam from "../models/ExamModel.js";
import Question from "../models/questionModel.js";


export const getDashboardStats = async (
  req: Request,
  res: Response
) => {
  try {
    const totalStudents = await User.countDocuments({
      role: UserRole.STUDENT,
    } as any);

    const totalAdmins = await User.countDocuments({
      role: UserRole.COLLEGE_ADMIN,
    } as any);

    const totalExams = await Exam.countDocuments();

    const totalQuestions = await Question.countDocuments();

    const totalResults = await Result.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalAdmins,
        totalExams,
        totalQuestions,
        totalResults,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getAllResults = async (
  req: Request,
  res: Response
) => {
  try {
    const results = await Result.find()
      .populate("student", "name email")
      .populate("exam", "title subject")
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


export const getExamResults = async (
  req: Request,
  res: Response
) => {
  try {
    const results = await Result.find({
      exam: req.params.examId as string,
    })
      .populate("student", "name email")
      .populate("exam", "title subject");

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

export const getStudentResults = async (
  req: Request,
  res: Response
) => {
  try {
    const results = await Result.find({
      student: req.params.studentId as string,
    }).populate("exam", "title subject duration");

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


export const getStudents = async (
  req: Request,
  res: Response
) => {
  try {
    const students = await User.find({
      role: UserRole.STUDENT,
    } as any).select("-password");

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const student = await User.findById(
      req.params.studentId as string
    ).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};