/**
 * Auth Routes
 * POST /api/auth/login
 * POST /api/auth/signup
 * GET /api/auth/me
 * PUT /api/auth/me
 */

import express from 'express';
import User from '../../models/User.js';
import { signToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user._id, email: user.email, name: user.name });

    res.json({ user: user.toSafeObject(), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken({ id: user._id, email: user.email, name: user.name });

    res.status(201).json({ user: user.toSafeObject(), token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('GET /auth/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(avatar !== undefined && { avatar }) },
      { new: true, runValidators: true }
    );

    res.json({ user: updated.toSafeObject() });
  } catch (err) {
    console.error('PUT /auth/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
