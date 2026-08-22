import type { Request, Response } from "express";
import mongoose from "mongoose";
import Exam from "../models/ExamModel.js";
import Result from "../models/resultModel.js";
import Question from "../models/questionModel.js";
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

    if (!isValidExamAccessToken(req.header("x-exam-access-token"), req.user._id as string, req.params.examId as string)) {
      return res.status(403).json({ success: false, message: "Verify the security code before submitting this exam" });
    }

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
    const { answers = [], timeTaken = 0 } = req.body;

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
        score += question.marks || 0;
      } else {
        wrongAnswers++;
        score -= question.negativeMarks || 0;
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
      timeTaken,
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
      .populate("answers.question", "question options correctAnswer marks negativeMarks")
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    const allQuestions = await Question.find({ examId: result.exam._id }).select("question options correctAnswer marks negativeMarks").lean();

    res.status(200).json({
      success: true,
      data: {
        ...result,
        allQuestions
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
    const announcements = await mongoose.model("Announcement").find().sort({ createdAt: -1 });

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