import { Router } from "express";
import authMiddleware from "../middlewares/authmiddleware.js";

import {
  getAvailableExams,
  getExamById,
  startExam,
  submitExam,
  getMyResults,
  getResultById,
} from "../controllers/StudentController.js";

const router = Router();

router.get("/exams", authMiddleware, getAvailableExams);

router.get("/exams/:examId", authMiddleware, getExamById);

router.post("/exams/:examId/start", authMiddleware, startExam);

router.post("/exams/:examId/submit", authMiddleware, submitExam);


router.get("/results", authMiddleware, getMyResults);

router.get("/results/:resultId", authMiddleware, getResultById);

export default router;