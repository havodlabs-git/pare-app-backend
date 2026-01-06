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

// Elite plan only routes
router.post('/create', protect, restrictTo('elite'), createAppointment);
router.get('/my-appointments', protect, restrictTo('elite'), getUserAppointments);
router.get('/:id', protect, restrictTo('elite'), getAppointmentDetails);
router.post('/:id/cancel', protect, restrictTo('elite'), cancelAppointment);

export default router;
