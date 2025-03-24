import express from 'express';
import { registerUser } from '../controllers/registrationControllers/registrationController.js';

const router = express.Router();

// POST /register
// This endpoint allows a user to register using an invitation token.
router.post('/register', registerUser);

export default router;