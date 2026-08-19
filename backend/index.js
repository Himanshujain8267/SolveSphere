import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/connectDb.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";

const app = express();

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173", // Frontend URL
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

// Connect to database before accepting requests.
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exitCode = 1;
  });