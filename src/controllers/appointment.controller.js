import { getFirestore } from '../config/firestore.js';
import zoomService from '../services/zoom.service.js';

// @desc    Get list of available professionals
// @route   GET /api/appointments/professionals
// @access  Private
export const getProfessionals = async (req, res) => {
  try {
    const db = getFirestore();
    const professionalsSnapshot = await db.collection('professionals')
      .where('isActive', '==', true)
      .get();

    const professionals = professionalsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        title: data.title,
        specialty: data.specialty,
        bio: data.bio,
        photoUrl: data.photoUrl,
        rating: data.rating || 5.0,
        totalSessions: data.totalSessions || 0,
        languages: data.languages || ['Português'],
        pricePerSession: data.pricePerSession || 0, // Included in Elite plan
        availableDays: data.availableDays || []
      };
    });

    res.status(200).json({
      success: true,
      data: professionals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar profissionais',
      error: error.message
    });
  }
};

// @desc    Get professional availability
// @route   GET /api/appointments/professionals/:id/availability
// @access  Private
export const getProfessionalAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD
    const db = getFirestore();

    // Get professional
    const professionalDoc = await db.collection('professionals').doc(id).get();
    
    if (!professionalDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Profissional não encontrado'
      });
    }

    const professional = professionalDoc.data();

    // Get existing appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsSnapshot = await db.collection('appointments')
      .where('professionalId', '==', id)
      .where('scheduledAt', '>=', startOfDay)
      .where('scheduledAt', '<=', endOfDay)
      .where('status', 'in', ['scheduled', 'confirmed'])
      .get();

    const bookedSlots = appointmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.scheduledAt.toDate().toISOString();
    });

    // Generate available time slots based on professional's schedule
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daySchedule = professional.schedule?.[dayNames[dayOfWeek]] || [];

    const availableSlots = [];
    
    for (const slot of daySchedule) {
      const slotTime = new Date(`${date}T${slot.start}:00`);
      const slotIso = slotTime.toISOString();
      
      if (!bookedSlots.includes(slotIso) && slotTime > new Date()) {
        availableSlots.push({
          time: slot.start,
          datetime: slotIso,
          duration: slot.duration || 50 // 50 minutes default
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        professionalId: id,
        date,
        availableSlots,
        timezone: 'America/Sao_Paulo'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar disponibilidade',
      error: error.message
    });
  }
};

// @desc    Create appointment
// @route   POST /api/appointments/create
// @access  Private (Elite only)
export const createAppointment = async (req, res) => {
  try {
    const { professionalId, scheduledAt, notes } = req.body;
    const db = getFirestore();

    // Validate professional exists
    const professionalDoc = await db.collection('professionals').doc(professionalId).get();
    
    if (!professionalDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Profissional não encontrado'
      });
    }

    const professional = professionalDoc.data();
    const appointmentTime = new Date(scheduledAt);

    // Check if slot is still available
    const existingAppointment = await db.collection('appointments')
      .where('professionalId', '==', professionalId)
      .where('scheduledAt', '==', appointmentTime)
      .where('status', 'in', ['scheduled', 'confirmed'])
      .get();

    if (!existingAppointment.empty) {
      return res.status(400).json({
        success: false,
        message: 'Este horário já está reservado'
      });
    }

    // Create Zoom meeting (placeholder - will be implemented with Zoom API)
    const zoomMeeting = await createZoomMeeting({
      topic: `Sessão com ${professional.name}`,
      startTime: appointmentTime,
      duration: 50,
      hostEmail: professional.email
    });

    // Create appointment
    const appointmentData = {
      userId: req.user.id,
      professionalId,
      professionalName: professional.name,
      scheduledAt: appointmentTime,
      duration: 50,
      status: 'scheduled',
      notes: notes || '',
      zoomMeetingId: zoomMeeting.id,
      zoomJoinUrl: zoomMeeting.joinUrl,
      zoomStartUrl: zoomMeeting.startUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const appointmentRef = await db.collection('appointments').add(appointmentData);

    // Update professional's total sessions
    await professionalDoc.ref.update({
      totalSessions: (professional.totalSessions || 0) + 1
    });

    res.status(201).json({
      success: true,
      message: 'Sessão agendada com sucesso!',
      data: {
        id: appointmentRef.id,
        ...appointmentData,
        professional: {
          id: professionalId,
          name: professional.name,
          title: professional.title
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao agendar sessão',
      error: error.message
    });
  }
};

// @desc    Get user's appointments
// @route   GET /api/appointments/my-appointments
// @access  Private (Elite only)
export const getUserAppointments = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const db = getFirestore();

    let query = db.collection('appointments').where('userId', '==', req.user.id);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (upcoming === 'true') {
      query = query.where('scheduledAt', '>=', new Date());
    }

    const appointmentsSnapshot = await query.orderBy('scheduledAt', 'asc').get();

    const appointments = appointmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        professionalId: data.professionalId,
        professionalName: data.professionalName,
        scheduledAt: data.scheduledAt.toDate(),
        duration: data.duration,
        status: data.status,
        zoomJoinUrl: data.zoomJoinUrl,
        notes: data.notes
      };
    });

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar agendamentos',
      error: error.message
    });
  }
};

// @desc    Get appointment details
// @route   GET /api/appointments/:id
// @access  Private (Elite only)
export const getAppointmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getFirestore();

    const appointmentDoc = await db.collection('appointments').doc(id).get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    const appointment = appointmentDoc.data();

    if (appointment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Get professional details
    const professionalDoc = await db.collection('professionals').doc(appointment.professionalId).get();
    const professional = professionalDoc.exists ? professionalDoc.data() : null;

    res.status(200).json({
      success: true,
      data: {
        id: appointmentDoc.id,
        ...appointment,
        scheduledAt: appointment.scheduledAt.toDate(),
        createdAt: appointment.createdAt.toDate(),
        professional: professional ? {
          id: appointment.professionalId,
          name: professional.name,
          title: professional.title,
          photoUrl: professional.photoUrl
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do agendamento',
      error: error.message
    });
  }
};

// @desc    Cancel appointment
// @route   POST /api/appointments/:id/cancel
// @access  Private (Elite only)
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getFirestore();

    const appointmentDoc = await db.collection('appointments').doc(id).get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    const appointment = appointmentDoc.data();

    if (appointment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Este agendamento já foi cancelado'
      });
    }

    // Check if appointment is in the past
    if (appointment.scheduledAt.toDate() < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível cancelar agendamentos passados'
      });
    }

    // Cancel Zoom meeting (placeholder)
    if (appointment.zoomMeetingId) {
      await cancelZoomMeeting(appointment.zoomMeetingId);
    }

    // Update appointment status
    await appointmentDoc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason || 'Cancelado pelo usuário',
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Agendamento cancelado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar agendamento',
      error: error.message
    });
  }
};

// Helper function to create Zoom meeting
async function createZoomMeeting({ topic, startTime, duration, hostEmail }) {
  try {
    // Check if Zoom is configured
    const isConfigured = await zoomService.isConfigured();
    
    if (!isConfigured) {
      // Return placeholder if Zoom not configured
      const meetingId = `placeholder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: meetingId,
        joinUrl: `https://zoom.us/j/${meetingId}`,
        startUrl: `https://zoom.us/s/${meetingId}`,
        password: Math.random().toString(36).substr(2, 6).toUpperCase()
      };
    }

    // Create real Zoom meeting
    const meeting = await zoomService.createMeeting({
      topic,
      startTime: startTime.toISOString(),
      duration,
      hostEmail
    });

    return {
      id: meeting.meetingId,
      joinUrl: meeting.joinUrl,
      startUrl: meeting.startUrl,
      password: meeting.password
    };
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    // Fallback to placeholder on error
    const meetingId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: meetingId,
      joinUrl: `https://zoom.us/j/${meetingId}`,
      startUrl: `https://zoom.us/s/${meetingId}`,
      password: Math.random().toString(36).substr(2, 6).toUpperCase()
    };
  }
}

// Helper function to cancel Zoom meeting
async function cancelZoomMeeting(meetingId) {
  try {
    // Check if it's a real Zoom meeting (not placeholder)
    if (meetingId.startsWith('placeholder_') || meetingId.startsWith('fallback_') || meetingId.startsWith('zoom_')) {
      console.log(`Skipping cancellation for placeholder meeting: ${meetingId}`);
      return true;
    }

    const isConfigured = await zoomService.isConfigured();
    if (!isConfigured) {
      return true;
    }

    await zoomService.deleteMeeting(meetingId);
    return true;
  } catch (error) {
    console.error('Error cancelling Zoom meeting:', error);
    return false;
  }
}
