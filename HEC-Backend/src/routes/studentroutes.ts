import { Router } from "express";
import authMiddleware from "../middlewares/authmiddleware.js";

import {
  getAvailableExams,
  getExamById,
  verifyExamCode,
  startExam,
  submitExam,
  getMyResults,
  getResultById,
  getExamLeaderboard,
  getLeaderboardExams,
  getAnnouncements,
} from "../controllers/StudentController.js";

const router = Router();

router.get("/exams", authMiddleware, getAvailableExams);

router.get("/exams/:examId", authMiddleware, getExamById);

router.post("/exams/:examId/verify-code", authMiddleware, verifyExamCode);

router.post("/exams/:examId/start", authMiddleware, startExam);

router.post("/exams/:examId/submit", authMiddleware, submitExam);


router.get("/results", authMiddleware, getMyResults);

router.get("/results/:resultId", authMiddleware, getResultById);

router.get("/exams/:examId/leaderboard", authMiddleware, getExamLeaderboard);

router.get("/leaderboard-list", authMiddleware, getLeaderboardExams);

router.get("/announcements", authMiddleware, getAnnouncements);

export default router;