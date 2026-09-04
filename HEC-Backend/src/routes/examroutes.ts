import { Router } from "express";

import {
  createExam,
  deleteExam,
  getExam,
  getExams,
  updateExam,
  addQuestionsToExam,
  publishExam,
  unpublishExam,
  removeQuestionFromExam,
  toggleResultsRelease,
} from "../controllers/ExamController.js";

import {adminMiddleware} from "../middlewares/adminmiddleware.js";

import authMiddleware from "../middlewares/authmiddleware.js";

const router = Router();

router.post("/", authMiddleware, adminMiddleware, createExam);

router.get("/", authMiddleware, adminMiddleware, getExams);

router.get("/:id", authMiddleware, adminMiddleware, getExam);

router.put("/:id", authMiddleware, adminMiddleware, updateExam);

router.delete("/:id", authMiddleware, adminMiddleware, deleteExam);

router.post(
    "/:id/questions",
    authMiddleware,
    adminMiddleware,
    addQuestionsToExam
);

router.delete(
  "/:examId/questions/:questionId",
  authMiddleware,
  adminMiddleware,
  removeQuestionFromExam
);

router.patch("/:id/publish", authMiddleware, adminMiddleware ,  publishExam);

router.patch("/:id/unpublish", authMiddleware, adminMiddleware, unpublishExam);

router.patch("/:id/toggle-results-release", authMiddleware, adminMiddleware, toggleResultsRelease);

export default router;