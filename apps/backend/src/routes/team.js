/**
 * Team Routes
 * GET /api/team
 * POST /api/team
 * GET /api/team/:id
 * PUT /api/team/:id
 * DELETE /api/team/:id
 */

import express from 'express';
import Team from '../../models/Team.js';
import User from '../../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/team — list user's teams
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const teams = await Team.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    }).populate('ownerId', 'name email avatar');

    res.json({ teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/team — create team
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ error: 'Team name is required' });

    const team = await Team.create({
      name,
      description,
      ownerId: userId,
      members: [{ userId: userId, role: 'admin' }],
      inviteToken: uuidv4(),
    });

    res.status(201).json({ team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/team/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const team = await Team.findById(req.params.id)
      .populate('ownerId', 'name email avatar')
      .populate('members.userId', 'name email avatar');

    if (!team) return res.status(404).json({ error: 'Team not found' });

    const isMember = team.members.some((m) => m.userId._id.toString() === userId) ||
      team.ownerId._id.toString() === userId;
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/team/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const team = await Team.findById(req.params.id);

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.ownerId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ team: updated });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/team/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const team = await Team.findById(req.params.id);

    // If not found, still return success (idempotent delete)
    if (!team) {
      return res.json({
        message: 'Team deleted',
        teamId: req.params.id
      });
    }

    if (team.ownerId.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });

    await Team.findByIdAndDelete(req.params.id);
    res.json({
      message: 'Team deleted',
      teamId: req.params.id
    });
  } catch (err) {
    console.error('[DELETE /api/team/:id] Error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
