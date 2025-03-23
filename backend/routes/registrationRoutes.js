import { registerUser } from '../controllers/registrationController.js';

const router = express.Router();

// POST /register
// This endpoint allows a user to register using an invitation token.
router.post('/register', registerUser);

export default router;