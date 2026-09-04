import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "./config/db.js";
dotenv.config();

import authRoutes from "./routes/authroutes.js";
import questionRoutes from "./routes/questionroutes.js";
import ExamRoutes from "./routes/examroutes.js"
import studentRoutes from "./routes/studentroutes.js";
import adminRoutes from "./routes/adminroutes.js";

import { startExamStatusUpdater } from "./utils/cron.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(cors()); 
app.use(express.json({ limit: "50mb" }));


app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/exam" , ExamRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  // Start the background cron job to update expired exams
  startExamStatusUpdater();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();