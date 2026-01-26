import express from 'express';
import { 
  getProfessionals,
  getProfessionalAvailability,
  createAppointment,
  getUserAppointments,
  cancelAppointment,
  getAppointmentDetails
} from '../controllers/appointment.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (need auth but any plan)
router.get('/professionals', protect, getProfessionals);
router.get('/professionals/:id/availability', protect, getProfessionalAvailability);

// Premium and Elite plan routes (sessions with psychologists)
router.post('/create', protect, restrictTo('premium', 'elite'), createAppointment);
router.get('/my-appointments', protect, restrictTo('premium', 'elite'), getUserAppointments);
router.get('/:id', protect, restrictTo('premium', 'elite'), getAppointmentDetails);
router.post('/:id/cancel', protect, restrictTo('premium', 'elite'), cancelAppointment);

export default router;
