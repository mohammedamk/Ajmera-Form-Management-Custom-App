import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const dbconnection = () => {
  try {
    console.log("process.env.MONGODB_URI ", process.env.MONGODB_URI);
    const dbURI: any =
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI
        : "mongodb://localhost:27017/ajmera-form-manager";
    mongoose.connect(dbURI);
    console.log("connected to mongoDB successfully");
  } catch (error) {
    console.log("connection error", error);
  }
};

