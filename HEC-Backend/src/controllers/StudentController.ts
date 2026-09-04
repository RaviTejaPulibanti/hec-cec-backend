import type { Request, Response } from "express";
import mongoose from "mongoose";
import Exam from "../models/ExamModel.js";
import Result from "../models/resultModel.js";
import Question from "../models/questionModel.js";
import ExamAttempt from "../models/ExamAttemptModel.js";
import Announcement from "../models/AnnouncementModel.js";
import bcrypt from "bcrypt";
import { generateExamAccessToken, isValidExamAccessToken } from "../utils/jwt.js";



export const getAvailableExams = async (
  req: Request,
  res: Response
) => {

   try {
    const now = new Date();

    const activeExams = await Exam.find({
      status: "PUBLISHED",
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select("-questions");

    // Only show PUBLISHED upcoming exams to students (hide draft exams)
    const upcomingExams = await Exam.find({
      status: "PUBLISHED",
      startTime: { $gt: now },
    }).select("-questions");

    res.status(200).json({
      success: true,
      data: {
        active: activeExams,
        upcoming: upcomingExams,
      },
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

    if (!isValidExamAccessToken(req.header("x-exam-access-token"), req.user._id as string, examId as string)) {
      return res.status(403).json({
        success: false,
        message: "Enter the security code before starting this exam",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(examId as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam id",
      });
    }

    // Check if student already submitted this exam
    const existingResult = await Result.findOne({
      student: req.user._id as any,
      exam: examId as any,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam.",
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

    // Track or initialize student's exam attempt on the server
    let attempt = await ExamAttempt.findOne({
      student: req.user._id,
      exam: exam._id,
    });

    if (!attempt) {
      attempt = await ExamAttempt.create({
        student: req.user._id,
        exam: exam._id,
        startedAt: now,
        status: "IN_PROGRESS",
      });
    } else if (attempt.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam.",
      });
    }

    const durationSeconds = exam.duration * 60;
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000));
    const remainingDurationSeconds = Math.max(0, durationSeconds - elapsedSeconds);
    const windowRemainingSeconds = Math.max(0, Math.floor((new Date(exam.endTime).getTime() - now.getTime()) / 1000));
    const remainingSeconds = Math.min(remainingDurationSeconds, windowRemainingSeconds);

    const questions = await Question.find({ examId: exam._id }).select("question imageUrl options marks negativeMarks");
    
    // Attach questions and server session time to the exam object
    (exam as any).questions = questions;
    (exam as any).startedAt = attempt.startedAt;
    (exam as any).remainingSeconds = remainingSeconds;

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

export const verifyExamCode = async (
  req: Request,
  res: Response
) => {
  try {
    const examId = req.params.examId as string;
    const { securityCode } = req.body;
    const now = new Date();

    if (!mongoose.Types.ObjectId.isValid(examId) || typeof securityCode !== "string" || !securityCode.trim()) {
      return res.status(400).json({ success: false, message: "A valid security code is required" });
    }

    const exam = await Exam.findOne({
      _id: examId,
      status: "PUBLISHED",
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select("+securityCodeHash");

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam is not available" });
    }

    const isValid = exam.securityCodeHash
      ? await bcrypt.compare(securityCode.trim(), exam.securityCodeHash)
      : false;

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid security code", data :{accessToken: null

      } });
    }

    return res.status(200).json({
      success: true,
      message: "Security code verified",
      data: { accessToken: generateExamAccessToken(req.user._id as string, examId) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const startExam = async (
  req: Request,
  res: Response
) => {
  try {
    const now = new Date();
    const examId = req.params.examId as string;

    const exam = await Exam.findOne({
      _id: examId,
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

    const existingResult = await Result.findOne({
      student: req.user._id,
      exam: examId,
    });
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam.",
      });
    }

    let attempt = await ExamAttempt.findOne({
      student: req.user._id,
      exam: examId,
    });

    if (!attempt) {
      attempt = await ExamAttempt.create({
        student: req.user._id,
        exam: examId,
        startedAt: now,
        status: "IN_PROGRESS",
      });
    } else if (attempt.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam started successfully",
      data: {
        examId: exam._id,
        title: exam.title,
        duration: exam.duration,
        startTime: attempt.startedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const areResultsReleased = (exam: any, now: Date = new Date()): boolean => {
  if (!exam) return false;
  if (exam.resultsReleaseOverride === true) return exam.resultsReleased === true;
  if (exam.resultsReleased === true) return true;

  const mode = exam.resultReleaseMode || "AFTER_EXAM";

  if (mode === "IMMEDIATE") {
    return true;
  }

  if (mode === "AFTER_EXAM") {
    const isCompleted = exam.status === "COMPLETED";
    const isTimePassed = exam.endTime && new Date(exam.endTime).getTime() <= now.getTime();
    return isCompleted || isTimePassed;
  }

  // If MANUAL, only returns true when exam.resultsReleased === true (handled above)
  return false;
};

export const submitExam = async (
  req: Request,
  res: Response
) => {
  try {
    const examId = req.params.examId as string;
    const userId = req.user._id as string;

    if (!isValidExamAccessToken(req.header("x-exam-access-token"), userId, examId)) {
      return res.status(403).json({ success: false, message: "Verify the security code before submitting this exam" });
    }

    const existingResult = await Result.findOne({
      student: userId,
      exam: examId,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam.",
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const now = Date.now();
    const examEndTime = new Date(exam.endTime).getTime();
    const gracePeriodMs = 2 * 60 * 1000; // 2 minutes grace period

    if (now > examEndTime + gracePeriodMs) {
      return res.status(400).json({
        success: false,
        message: "Exam submission rejected: Time window has closed.",
      });
    }

    // Look up exam attempt to verify server-side duration
    let attempt = await ExamAttempt.findOne({
      student: userId,
      exam: examId,
    });

    const serverElapsedSeconds = attempt
      ? Math.max(0, Math.round((now - new Date(attempt.startedAt).getTime()) / 1000))
      : Math.max(0, Number(req.body.timeTaken) || 0);

    const maxAllowedDurationSeconds = (exam.duration * 60) + 120; // duration + 2 min buffer
    if (attempt && serverElapsedSeconds > maxAllowedDurationSeconds) {
      return res.status(400).json({
        success: false,
        message: "Exam submission rejected: Exam duration exceeded.",
      });
    }

    const { answers = [], timeTaken = 0 } = req.body;
    const verifiedTimeTaken = attempt
      ? Math.min(Math.max(1, Number(timeTaken) || serverElapsedSeconds), serverElapsedSeconds)
      : Math.max(1, Number(timeTaken) || 0);

    const questions = await Question.find({ examId: exam._id });

    let score = 0;
    let totalMarks = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    for (const question of questions) {
      totalMarks += question.marks || 0;
      const submittedAnswer = answers.find(
        (answer: any) => answer.question === question._id.toString()
      );

      if (!submittedAnswer || submittedAnswer.selectedOption === undefined || submittedAnswer.selectedOption === null) continue;

      if (submittedAnswer.selectedOption === question.correctAnswer) {
        correctAnswers++;
        score += question.marks || 0;
      } else {
        wrongAnswers++;
        score -= question.negativeMarks || 0;
      }
    }

    const unattempted = questions.length - (correctAnswers + wrongAnswers);

    const result = await Result.create({
      student: userId,
      exam: exam._id,
      answers,
      score,
      totalMarks,
      correctAnswers,
      wrongAnswers,
      unattempted,
      timeTaken: verifiedTimeTaken,
    });

    if (attempt) {
      attempt.status = "SUBMITTED";
      attempt.submittedAt = new Date();
      await attempt.save();
    }

    const resultsReleased = areResultsReleased(exam);

    res.status(201).json({
      success: true,
      message: resultsReleased
        ? "Exam submitted successfully"
        : "Exam submitted successfully. Results will be released by the college admin.",
      resultsReleased,
      data: resultsReleased
        ? result
        : {
            _id: result._id,
            student: result.student,
            exam: result.exam,
            submittedAt: result.submittedAt,
            resultsReleased: false,
          },
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
      .populate("exam", "title duration status endTime resultReleaseMode resultsReleased")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    const resultsWithDetails = await Promise.all(
      results.map(async (result) => {
        if (!result.exam) {
          return {
            ...result,
            resultsReleased: false,
            totalMarks: 0,
            exam: { title: "Deleted Exam", duration: 0 }
          };
        }

        const isReleased = areResultsReleased(result.exam, now);

        if (!isReleased) {
          return {
            _id: result._id,
            exam: result.exam,
            submittedAt: result.submittedAt,
            resultsReleased: false,
            score: null,
            totalMarks: null,
            correctAnswers: null,
            wrongAnswers: null,
            unattempted: null,
            timeTaken: null,
          };
        }

        // If totalMarks is already stored on result, use it directly (O(1))
        let totalMarks = result.totalMarks;
        if (typeof totalMarks !== "number" || totalMarks === 0) {
          const questions = await Question.find({ examId: (result.exam as any)._id }).select("marks").lean();
          totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        }

        return {
          ...result,
          totalMarks,
          resultsReleased: true,
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
      .populate("exam", "title duration status endTime resultReleaseMode resultsReleased")
      .populate("answers.question", "question options marks negativeMarks")
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    const exam = result.exam as any;
    const now = new Date();
    const isReleased = areResultsReleased(exam, now);

    if (!isReleased) {
      return res.status(200).json({
        success: true,
        data: {
          _id: result._id,
          exam: result.exam,
          submittedAt: result.submittedAt,
          resultsReleased: false,
          solutionsReleased: false,
          score: null,
          totalMarks: null,
          allQuestions: [],
          message: "Results pending announcement",
        },
      });
    }

    const allQuestions = await Question.find({ examId: exam._id })
      .select("question imageUrl options correctAnswer marks negativeMarks")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...result,
        resultsReleased: true,
        solutionsReleased: true,
        allQuestions,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getExamLeaderboard = async (
  req: Request,
  res: Response
) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const isReleased = areResultsReleased(exam);
    if (!isReleased && req.user?.role !== "COLLEGE_ADMIN") {
      return res.status(200).json({
        success: true,
        resultsReleased: false,
        message: "Leaderboard will become available once exam results are officially released.",
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: { exam: new mongoose.Types.ObjectId(examId as string) },
      },
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentDoc",
        },
      },
      {
        $unwind: "$studentDoc",
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          "studentDoc.name": { $regex: search, $options: "i" },
        },
      });
    }

    // Sort by score descending, then timeTaken ascending, then submittedAt ascending
    pipeline.push({
      $sort: { score: -1, timeTaken: 1, submittedAt: 1 },
    });

    const facetPipeline = [
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const results = await Result.aggregate([...pipeline, ...facetPipeline]);

    const total = results[0].metadata[0]?.total || 0;
    const data = results[0].data.map((item: any, idx: number) => ({
      rank: skip + idx + 1,
      name: item.studentDoc.name,
      score: item.score,
      timeTaken: item.timeTaken,
      submittedAt: item.submittedAt,
    }));

    res.status(200).json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getLeaderboardExams = async (
  req: Request,
  res: Response
) => {
  try {
    const exams = await Exam.find({
      status: "COMPLETED",
    }).select("-questions").sort({ createdAt: -1 });

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

export const getAnnouncements = async (
  req: Request,
  res: Response
) => {
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