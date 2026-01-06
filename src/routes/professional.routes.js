import express from 'express';
import { 
  registerProfessional,
  loginProfessional,
  getProfessionalProfile,
  updateProfessionalProfile,
  updateSchedule,
  getProfessionalAppointments,
  updateAppointmentStatus
} from '../controllers/professional.controller.js';
import { protectProfessional } from '../middleware/auth.middleware.js';

const router = express.Router();

// Auth routes
router.post('/register', registerProfessional);
router.post('/login', loginProfessional);

// Protected routes (professional only)
router.get('/profile', protectProfessional, getProfessionalProfile);
router.put('/profile', protectProfessional, updateProfessionalProfile);
router.put('/schedule', protectProfessional, updateSchedule);
router.get('/appointments', protectProfessional, getProfessionalAppointments);
router.put('/appointments/:id/status', protectProfessional, updateAppointmentStatus);

export default router;
