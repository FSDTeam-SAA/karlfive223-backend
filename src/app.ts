import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import router from "./app/routes/routes";
import globalErrorHander from "./app/middlewares/globalError";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// router
app.use("/api/v1", router);

// root get
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("<h2>server is running</h2>");
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
