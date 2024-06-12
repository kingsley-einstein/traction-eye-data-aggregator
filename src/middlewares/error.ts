import { Request, Response } from "express";
import { HttpStatusCodes } from "../constants";

export const errorMiddleware = (err: any, req: Request, res: Response) => {
  const statusCode = err.statusCode ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
  return res.status(statusCode).json({
    error: err.message,
  });
};
