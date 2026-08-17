import Exam from "../models/ExamModel.js";

export const startExamStatusUpdater = () => {
  // Run every 60 seconds (60000 ms)
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find all published exams whose end time has already passed
      const result = await Exam.updateMany(
        { 
          status: "PUBLISHED", 
          endTime: { $lte: now } 
        },
        { 
          $set: { status: "COMPLETED" } 
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Exam Status Updater] Successfully moved ${result.modifiedCount} exams to COMPLETED state.`);
      }
    } catch (error) {
      console.error("[Exam Status Updater] Failed to update exam statuses:", error);
    }
  }, 60000);
  
  console.log("[Exam Status Updater] Background job started. Checking every 60 seconds...");
};
