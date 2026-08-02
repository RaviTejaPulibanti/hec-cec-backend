import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI as string;

  try {
    await mongoose.connect(mongoUri );
    console.log(" MongoDB Connected");
  } catch (error) {
    console.error(" Database Connection Failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

export default connectDB; 