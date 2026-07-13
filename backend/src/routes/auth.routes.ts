import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2),
});

router.get('/me', asyncHandler(getCurrentUser));

router.post(
  '/register',
  asyncHandler(async (req, _res) => {
    const input = registerSchema.parse(req.body);
    req.body = input;
    await registerUser(req, _res);
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    req.body = input;
    await loginUser(req, res);
  }),
);

router.post('/logout', asyncHandler(logoutUser));

export default router;
