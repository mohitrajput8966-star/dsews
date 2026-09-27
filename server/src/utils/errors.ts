import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/** Thrown deliberately by controllers for a specific, safe, user-facing message. */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Express error handler — never leaks stack traces or internals to the client. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid input.", details: err.flatten().fieldErrors });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}

/** Wraps an async route handler so rejected promises reach errorHandler instead of hanging the request. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
