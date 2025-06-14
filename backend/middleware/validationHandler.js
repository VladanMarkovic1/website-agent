import { validationResult } from 'express-validator';

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return a 400 Bad Request response with the validation errors
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  // If no errors, proceed to the next middleware or route handler
  next();
}; 