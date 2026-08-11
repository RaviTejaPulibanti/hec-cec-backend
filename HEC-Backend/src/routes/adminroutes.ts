import { Router } from "express";

import authMiddleware from "../middlewares/authmiddleware.js";
import {adminMiddleware} from "../middlewares/adminmiddleware.js";

import {
  getAllResults,
  getExamResults,
  getStudents,
  getStudent,
  getDashboardStats,
  getUsers,
  updateUserRole,
} from "../controllers/adminController.js";

const router = Router();

router.get(
  "/stats",
  authMiddleware,
  adminMiddleware,
  getDashboardStats
);

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

router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  getUsers
);

router.patch(
  "/users/:id/role",
  authMiddleware,
  adminMiddleware,
  updateUserRole
);

export default router;