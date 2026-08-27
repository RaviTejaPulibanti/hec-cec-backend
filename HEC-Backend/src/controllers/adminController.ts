import type{ Request, Response } from "express";

import Result from "../models/resultModel.js";
import User , {UserRole } from "../models/user.js";
import Exam from "../models/ExamModel.js";
import Question from "../models/questionModel.js";
import Announcement from "../models/AnnouncementModel.js";


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
    const completedExams = await Exam.countDocuments({ status: "COMPLETED" });

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalAdmins,
        totalExams,
        totalQuestions,
        totalResults,
        completedExams,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalStudents = await User.countDocuments({ role: "STUDENT" } as any);
    const totalExams = await Exam.countDocuments();
    const activeExams = await Exam.countDocuments({ status: "PUBLISHED" });

    // Fetch top 5 recent results
    const recentResults = await Result.find()
      .populate("student", "name email idNumber branch year")
      .populate("exam", "title")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalExams,
        activeExams,
        recentResults,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message } = req.body;
    const announcement = await Announcement.create({
      title,
      message,
      createdBy: (req as any).user._id,
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
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
      .populate("student", "name email idNumber branch year")
      .populate("exam", "title")
      .sort({ createdAt: -1 });

    const validResults = results.filter((r: any) => r.exam != null);
    const orphanedIds = results.filter((r: any) => r.exam == null).map(r => r._id);

    if (orphanedIds.length > 0) {
      // Self-heal the database by deleting orphaned results
      await Result.deleteMany({ _id: { $in: orphanedIds } });
    }

    res.status(200).json({
      success: true,
      count: validResults.length,
      data: validResults,
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
      .populate("student", "name email idNumber branch year")
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


export const getUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }
    
    if (req.query.role && req.query.role !== "ALL") {
      query.role = req.query.role;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response
) => {
  try {
    const { role } = req.body;
    
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};