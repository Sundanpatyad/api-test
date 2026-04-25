import express from 'express';
import axios from 'axios';
import User from '../../models/User.js';
import { signToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         avatar:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

// POST /api/auth/login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login an employee
 *     description: Authenticates a user using email and password. On success, returns a JWT token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
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
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    let { accessToken, code, redirectUri } = req.body;

    // Desktop apps must use the 'code' exchange flow
    if (code) {
      if (!redirectUri) return res.status(400).json({ error: 'Redirect URI is required for code exchange' });
      
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
      accessToken = tokenResponse.data.access_token;
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token or code is required' });
    }

    // Fetch user info from Google
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { sub: googleId, email, name, picture: avatar } = response.data;

    // Use Atomic Upsert to prevent race conditions (Duplicate Key Errors)
    const user = await User.findOneAndUpdate(
      { $or: [{ googleId }, { email: email.toLowerCase() }] },
      { 
        $set: { googleId, avatar }, // Always link/update these
        $setOnInsert: { name, email: email.toLowerCase(), isVerified: true } // Only if new
      },
      { upsert: true, new: true, runValidators: true }
    );

    const token = signToken({ id: user._id, email: user.email, name: user.name });
    res.json({ user: user.toSafeObject(), token });
  } catch (error) {
    console.error('Google Auth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
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
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages[0] });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Signup failed. Please try again later.' });
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
