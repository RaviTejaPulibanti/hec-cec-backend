import { Router } from "express";

import authMiddleware from "../middlewares/authmiddleware.js";
import {adminMiddleware} from "../middlewares/adminmiddleware.js";

import {
  getAllResults,
  getExamResults,
  getStudents,
  getStudent,
} from "../controllers/adminController.js";

const router = Router();

router.get(
  "/results",
  authMiddleware,
  adminMiddleware,
  getAllResults
);

router.get(
  "/results/:examId",
  authMiddleware,
  adminMiddleware,
  getExamResults
);

export default router;