import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
dotenv.config();

import authRoutes from "./routes/authroutes.js";
import questionRoutes from "./routes/questionroutes.js";

const app = express();

app.use(cors()); 
app.use(express.json()); 


app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);

const PORT = process.env.PORT || 5000;


const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();