import express from 'express';
import { getFirestore } from '../config/firestore.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Configuração do transporter de email (preparado para uso futuro)
// Para ativar o envio de email, configure as variáveis de ambiente:
// EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
const createEmailTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return null;
};

// POST /api/psychologist-partner/apply - Receber solicitação de psicólogo parceiro
router.post('/apply', async (req, res) => {
  try {
    const { name, email, phone, crp, specialty, experience, motivation } = req.body;

    // Validação básica
    if (!name || !email || !phone || !crp) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, preencha todos os campos obrigatórios (nome, email, telefone e CRP).'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, informe um email válido.'
      });
    }

    const db = getFirestore();

    // Verificar se já existe uma solicitação com este email ou CRP
    const existingByEmail = await db.collection('psychologist_applications')
      .where('email', '==', email.toLowerCase())
      .get();

    if (!existingByEmail.empty) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma solicitação com este email. Aguarde nosso contato.'
      });
    }

    const existingByCrp = await db.collection('psychologist_applications')
      .where('crp', '==', crp.toUpperCase())
      .get();

    if (!existingByCrp.empty) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma solicitação com este CRP. Aguarde nosso contato.'
      });
    }

    // Criar a solicitação no Firestore
    const applicationData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      crp: crp.toUpperCase().trim(),
      specialty: specialty?.trim() || '',
      experience: experience?.trim() || '',
      motivation: motivation?.trim() || '',
      status: 'pending', // pending, approved, rejected
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('psychologist_applications').add(applicationData);

    // Tentar enviar email de notificação (se configurado)
    const transporter = createEmailTransporter();
    if (transporter) {
      try {
        // Email para o admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@pare-app.com';
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@pare-app.com',
          to: adminEmail,
          subject: `Nova solicitação de Psicólogo Parceiro - ${name}`,
          html: `
            <h2>Nova Solicitação de Psicólogo Parceiro</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone}</p>
            <p><strong>CRP:</strong> ${crp}</p>
            <p><strong>Especialidade:</strong> ${specialty || 'Não informada'}</p>
            <p><strong>Experiência:</strong> ${experience || 'Não informada'}</p>
            <p><strong>Motivação:</strong></p>
            <p>${motivation || 'Não informada'}</p>
            <hr>
            <p><small>Solicitação recebida em ${new Date().toLocaleString('pt-BR')}</small></p>
          `,
        });

        // Email de confirmação para o psicólogo
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@pare-app.com',
          to: email,
          subject: 'Recebemos sua solicitação - Pare! App',
          html: `
            <h2>Olá, ${name}!</h2>
            <p>Recebemos sua solicitação para se tornar um Psicólogo Parceiro do Pare!</p>
            <p>Nossa equipe analisará suas informações e entrará em contato em breve.</p>
            <br>
            <p><strong>Dados da sua solicitação:</strong></p>
            <ul>
              <li>CRP: ${crp}</li>
              <li>Especialidade: ${specialty || 'Não informada'}</li>
            </ul>
            <br>
            <p>Obrigado pelo seu interesse em fazer parte da nossa rede de profissionais!</p>
            <br>
            <p>Atenciosamente,<br>Equipe Pare!</p>
          `,
        });

        console.log('Emails de notificação enviados com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não falhar a requisição se o email não for enviado
      }
    } else {
      console.log('Transporter de email não configurado. Solicitação salva sem envio de email.');
      console.log('Para ativar emails, configure: EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
    }

    // Log da solicitação para referência
    console.log('Nova solicitação de psicólogo parceiro:', {
      id: docRef.id,
      name,
      email,
      phone,
      crp,
      specialty,
      experience,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Solicitação enviada com sucesso! Entraremos em contato em breve.',
      data: {
        id: docRef.id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Erro ao processar solicitação de psicólogo parceiro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar sua solicitação. Por favor, tente novamente.'
    });
  }
});

// GET /api/psychologist-partner/applications - Listar solicitações (admin only)
router.get('/applications', async (req, res) => {
  try {
    // TODO: Adicionar middleware de autenticação admin
    const db = getFirestore();
    const { status } = req.query;

    let query = db.collection('psychologist_applications').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(100).get();
    
    const applications = [];
    snapshot.forEach(doc => {
      applications.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      success: true,
      data: { applications }
    });

  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar solicitações.'
    });
  }
});

// PUT /api/psychologist-partner/applications/:id/status - Atualizar status da solicitação
router.put('/applications/:id/status', async (req, res) => {
  try {
    // TODO: Adicionar middleware de autenticação admin
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: pending, approved ou rejected.'
      });
    }

    const db = getFirestore();
    const docRef = db.collection('psychologist_applications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada.'
      });
    }

    await docRef.update({
      status,
      notes: notes || '',
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: `Status atualizado para ${status}.`
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status da solicitação.'
    });
  }
});

export default router;
