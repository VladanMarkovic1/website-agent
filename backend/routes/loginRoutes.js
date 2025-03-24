import express from 'express';
import { loginUser } from '../controllers/loginControllers/loginController.js';

const router = express.Router();

// POST /login
// This endpoint authenticates a user and returns a JWT.
router.post('/login', loginUser);

export default router;