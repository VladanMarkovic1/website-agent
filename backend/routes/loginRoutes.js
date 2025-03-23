import { loginUser } from '../controllers/loginController.js';

const router = express.Router();

// POST /login
// This endpoint authenticates a user and returns a JWT.
router.post('/login', loginUser);

export default router;