import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import globalErrorHander from "./app/middlewares/globalError";
import router from "./app/routes/routes";

const app = express();

// app works

app.use(cors({ origin: true, credentials: true }));

// Webhook raw body parsing - must be before json parsing
app.post(
  "/api/v1/recurring-subscription/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// router
app.use("/api/v1", router);

// root get
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("<h2>server is running with ci-cd</h2>");
});

// router error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: "API not found",
    path: req.path,
  });
});

// global error handler
app.use(globalErrorHander);

export default app;
