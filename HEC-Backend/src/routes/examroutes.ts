import { Router } from "express";

import {
  createExam,
  deleteExam,
  getExam,
  getExams,
  updateExam,
} from "../controllers/ExamController.js";


import {adminMiddleware} from "../middlewares/adminmiddleware.js";

import authMiddleware from "../middlewares/authmiddleware.js";


const router = Router();

router.post("/", authMiddleware, adminMiddleware, createExam);

router.get("/", authMiddleware, getExams);


router.get("/:id", authMiddleware, getExam);

router.put("/:id", authMiddleware, adminMiddleware, updateExam);

router.delete("/:id", authMiddleware, adminMiddleware, deleteExam);

export default router;