import { NextFunction, Request, Response } from "express";
import { HttpStatusCodes } from "../constants";

export const errorMiddleware = (err: any, _1: Request, res: Response, _2: NextFunction) => {
  const statusCode = err.statusCode ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
  return res.status(statusCode).json({
    error: err.message,
  });
};
