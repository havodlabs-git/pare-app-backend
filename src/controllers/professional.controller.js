import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getFirestore } from '../config/firestore.js';

// Generate JWT token for professional
const generateProfessionalToken = (id) => {
  return jwt.sign({ id, type: 'professional' }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register new professional
// @route   POST /api/professionals/register
// @access  Public (but requires admin approval)
export const registerProfessional = async (req, res) => {
  try {
    const { name, email, password, title, specialty, crp, bio } = req.body;
    const db = getFirestore();

    // Validation
    if (!name || !email || !password || !title || !specialty || !crp) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios'
      });
    }

    // Check if professional already exists
    const professionalsRef = db.collection('professionals');
    const existingProfessional = await professionalsRef.where('email', '==', email.toLowerCase()).get();

    if (!existingProfessional.empty) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create professional (pending approval)
    const professionalData = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      title,
      specialty,
      crp, // Conselho Regional de Psicologia number
      bio: bio || '',
      photoUrl: '',
      isActive: false, // Requires admin approval
      isVerified: false,
      rating: 5.0,
      totalSessions: 0,
      languages: ['Português'],
      schedule: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const professionalDoc = await professionalsRef.add(professionalData);

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado! Aguarde aprovação do administrador.',
      data: {
        id: professionalDoc.id,
        name: professionalData.name,
        email: professionalData.email
      }
    });
  } catch (error) {
    console.error('Register professional error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cadastrar profissional',
      error: error.message
    });
  }
};

// @desc    Login professional
// @route   POST /api/professionals/login
// @access  Public
export const loginProfessional = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getFirestore();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha email e senha'
      });
    }

    // Find professional
    const professionalsRef = db.collection('professionals');
    const professionalSnapshot = await professionalsRef.where('email', '==', email.toLowerCase()).get();

    if (professionalSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    const professionalDoc = professionalSnapshot.docs[0];
    const professional = { id: professionalDoc.id, ...professionalDoc.data() };

    // Check if professional is active
    if (!professional.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Sua conta ainda não foi aprovada'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, professional.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Update last login
    await professionalDoc.ref.update({
      lastLogin: new Date(),
      updatedAt: new Date()
    });

    const token = generateProfessionalToken(professional.id);

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        professional: {
          id: professional.id,
          name: professional.name,
          email: professional.email,
          title: professional.title,
          specialty: professional.specialty
        },
        token
      }
    });
  } catch (error) {
    console.error('Login professional error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};

// @desc    Get professional profile
// @route   GET /api/professionals/profile
// @access  Private (Professional)
export const getProfessionalProfile = async (req, res) => {
  try {
    const db = getFirestore();
    const professionalDoc = await db.collection('professionals').doc(req.professional.id).get();

    if (!professionalDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Profissional não encontrado'
      });
    }

    const professional = { id: professionalDoc.id, ...professionalDoc.data() };
    delete professional.password;

    res.status(200).json({
      success: true,
      data: professional
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil',
      error: error.message
    });
  }
};

// @desc    Update professional profile
// @route   PUT /api/professionals/profile
// @access  Private (Professional)
export const updateProfessionalProfile = async (req, res) => {
  try {
    const { name, title, specialty, bio, photoUrl, languages } = req.body;
    const db = getFirestore();

    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (title) updateData.title = title;
    if (specialty) updateData.specialty = specialty;
    if (bio !== undefined) updateData.bio = bio;
    if (photoUrl) updateData.photoUrl = photoUrl;
    if (languages) updateData.languages = languages;

    await db.collection('professionals').doc(req.professional.id).update(updateData);

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
};

// @desc    Update professional schedule
// @route   PUT /api/professionals/schedule
// @access  Private (Professional)
export const updateSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    const db = getFirestore();

    // Validate schedule format
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of validDays) {
      if (schedule[day] && !Array.isArray(schedule[day])) {
        return res.status(400).json({
          success: false,
          message: `Formato inválido para ${day}`
        });
      }
    }

    await db.collection('professionals').doc(req.professional.id).update({
      schedule,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Agenda atualizada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar agenda',
      error: error.message
    });
  }
};

// @desc    Get professional's appointments
// @route   GET /api/professionals/appointments
// @access  Private (Professional)
export const getProfessionalAppointments = async (req, res) => {
  try {
    const { status, date, month } = req.query;
    const db = getFirestore();

    console.log('[DEBUG] getProfessionalAppointments - Professional ID:', req.professional.id);
    console.log('[DEBUG] getProfessionalAppointments - Query params:', { status, date, month });

    // Buscar todos os appointments do profissional (evita problema de índice composto do Firestore)
    const appointmentsSnapshot = await db.collection('appointments')
      .where('professionalId', '==', req.professional.id)
      .get();

    console.log('[DEBUG] getProfessionalAppointments - Total appointments found:', appointmentsSnapshot.size);

    let appointments = await Promise.all(appointmentsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Get user info
      const userDoc = await db.collection('users').doc(data.userId).get();
      const user = userDoc.exists ? userDoc.data() : null;

      const scheduledAt = data.scheduledAt?.toDate ? data.scheduledAt.toDate() : new Date(data.scheduledAt);

      return {
        id: doc.id,
        odUserId: data.userId,
        userId: data.userId,
        userName: user?.name || 'Usuário',
        userEmail: user?.email || '',
        scheduledAt: scheduledAt,
        duration: data.duration,
        status: data.status,
        notes: data.notes,
        meetingUrl: data.meetingJoinUrl || data.zoomJoinUrl,
        meetingJoinUrl: data.meetingJoinUrl,
        zoomStartUrl: data.zoomStartUrl,
        zoomJoinUrl: data.zoomJoinUrl
      };
    }));

    // Filtrar por status se especificado
    if (status) {
      appointments = appointments.filter(apt => apt.status === status);
    }

    // Filtrar por data se especificado
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      appointments = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate >= startOfDay && aptDate <= endOfDay;
      });
    } else if (month) {
      // Filtrar por mês (formato: YYYY-MM)
      const [year, monthNum] = month.split('-').map(Number);
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
      
      appointments = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledAt);
        return aptDate >= startOfMonth && aptDate <= endOfMonth;
      });
    }

    // Ordenar por data
    appointments.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    console.log('[DEBUG] getProfessionalAppointments - Filtered appointments:', appointments.length);

    res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('[ERROR] getProfessionalAppointments:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar agendamentos',
      error: error.message
    });
  }
};

// @desc    Update appointment status
// @route   PUT /api/professionals/appointments/:id/status
// @access  Private (Professional)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getFirestore();

    const validStatuses = ['confirmed', 'completed', 'cancelled', 'no-show'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }

    const appointmentDoc = await db.collection('appointments').doc(id).get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    const appointment = appointmentDoc.data();

    if (appointment.professionalId !== req.professional.id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData.professionalNotes = notes;
    }

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await appointmentDoc.ref.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message
    });
  }
};
