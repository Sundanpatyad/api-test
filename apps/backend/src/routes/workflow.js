import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';
import User from '../../models/User.js';

const router = express.Router();

// ─── Workflow Routes ────────────────────────────────────────────────────────

// GET /api/workflow - List workflows
router.get('/', authenticate, async (req, res) => {
  try {
    const { teamId, projectId, search } = req.query;
    let query = db.collection('workflows');

    if (teamId) query = query.where('teamId', '==', teamId);
    if (projectId) query = query.where('projectId', '==', projectId);
    
    // Firestore doesn't support easy case-insensitive partial match like MongoDB
    // For simple search, we fetch and filter in memory if needed, 
    // but better to use proper Firestore queries if possible.
    
    const snapshot = await query.get();
    let workflows = snapshot.docs.map(doc => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data()
    }));

    // Sort in memory to avoid "index required" error
    workflows.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0);
      const dateB = new Date(b.updatedAt || 0);
      return dateB - dateA;
    });

    if (search) {
      const searchLower = search.toLowerCase();
      workflows = workflows.filter(w => w.name.toLowerCase().includes(searchLower));
    }

    // Manual populate for createdBy (User is still in MongoDB)
    const userIds = [...new Set(workflows.map(w => w.createdBy))].filter(id => id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    workflows = workflows.map(w => ({
      ...w,
      createdBy: userMap[w.createdBy] || { _id: w.createdBy, name: 'Unknown' }
    }));

    res.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// GET /api/workflow/:id - Get single workflow
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('workflows').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const workflowData = doc.data();
    const workflow = {
      _id: doc.id,
      id: doc.id,
      ...workflowData
    };

    // Manual populate for createdBy
    if (workflow.createdBy) {
      const user = await User.findById(workflow.createdBy).select('name email').lean();
      workflow.createdBy = user || { _id: workflow.createdBy, name: 'Unknown' };
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// POST /api/workflow - Create workflow
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, teamId, projectId, nodes, edges } = req.body;

    if (!name || !teamId) {
      return res.status(400).json({ error: 'Name and teamId are required' });
    }

    const now = new Date().toISOString();
    const workflowPayload = {
      name,
      description: description || '',
      teamId,
      projectId: projectId || null,
      nodes: nodes || [],
      edges: edges || [],
      createdBy: req.user.id,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('workflows').add(workflowPayload);
    
    // Fetch and return populated
    const user = await User.findById(req.user.id).select('name email').lean();
    const workflow = {
      _id: docRef.id,
      id: docRef.id,
      ...workflowPayload,
      createdBy: user || { _id: req.user.id, name: req.user.name || 'Current User' }
    };

    res.status(201).json({ workflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow' });
  }
});

// PUT /api/workflow/:id - Update workflow
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    const docRef = db.collection('workflows').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const currentData = doc.data();
    const updates = {
      updatedAt: new Date().toISOString(),
      version: (currentData.version || 0) + 1
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (nodes !== undefined) updates.nodes = nodes;
    if (edges !== undefined) updates.edges = edges;

    await docRef.update(updates);

    // Fetch updated and populate
    const updatedDoc = await docRef.get();
    const workflow = {
      _id: updatedDoc.id,
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    if (workflow.createdBy) {
      const user = await User.findById(workflow.createdBy).select('name email').lean();
      workflow.createdBy = user || { _id: workflow.createdBy, name: 'Unknown' };
    }

    res.json({ workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/workflow/:id - Delete workflow
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const docRef = db.collection('workflows').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await docRef.delete();
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router;
