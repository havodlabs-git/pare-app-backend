import express from 'express';
import {
  getModules,
  getModule,
  createModule,
  checkIn,
  recordRelapse,
  deleteModule,
  getModuleStats
} from '../controllers/module.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all module routes
router.use(protect);

router.route('/')
  .get(getModules)
  .post(createModule);

router.route('/:id')
  .get(getModule)
  .delete(deleteModule);

router.put('/:id/checkin', checkIn);
router.post('/:id/relapse', recordRelapse);
router.get('/:id/stats', getModuleStats);

export default router;
