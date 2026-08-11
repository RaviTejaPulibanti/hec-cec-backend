import { Router } from "express";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
} from "../controllers/questionController.js";
import authMiddleware from "../middlewares/authmiddleware.js";
import { adminMiddleware } from "../middlewares/adminmiddleware.js";

const router = Router();

router.post("/", authMiddleware, adminMiddleware, createQuestion);

router.get("/", authMiddleware, getQuestions);

router.get("/:id", authMiddleware, getQuestion);

router.put("/:id", authMiddleware, adminMiddleware, updateQuestion);

router.delete("/:id", authMiddleware, adminMiddleware, deleteQuestion);

export default router;