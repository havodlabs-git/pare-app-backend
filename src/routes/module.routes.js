import express from 'express';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all module routes
router.use(protect);

// TODO: Implement module routes
// GET /api/modules - Get all user modules
// POST /api/modules - Create new module
// GET /api/modules/:id - Get specific module
// PUT /api/modules/:id - Update module
// DELETE /api/modules/:id - Delete module
// POST /api/modules/:id/relapse - Record a relapse
// POST /api/modules/:id/checkin - Manual check-in

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Modules endpoint (TODO)'
  });
});

export default router;
