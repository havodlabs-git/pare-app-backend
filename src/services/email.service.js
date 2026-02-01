import nodemailer from 'nodemailer';

// Configuração do transporter de email
let transporter = null;

/**
 * Inicializa o transporter de email
 * Suporta múltiplos provedores: SMTP genérico, Gmail, SendGrid, etc.
 */
export const initializeEmailService = () => {
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };

  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('📧 Email service initialized');
    return true;
  }

  console.warn('⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
  return false;
};

/**
 * Envia um email
 * @param {Object} options - Opções do email
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.html - Corpo do email em HTML
 * @param {string} options.text - Corpo do email em texto puro (opcional)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.error('Email service not initialized');
    throw new Error('Serviço de email não configurado');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Gera o template HTML para o email de OTP
 * @param {string} code - Código OTP
 * @param {string} userName - Nome do usuário (opcional)
 * @param {number} expiresInMinutes - Tempo de expiração em minutos
 */
export const generateOTPEmailTemplate = (code, userName = '', expiresInMinutes = 10) => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - Pare!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Pare!</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Transforme seus hábitos</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
                ${userName ? `Olá, ${userName}!` : 'Olá!'}
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para verificar sua conta. Use o código abaixo para continuar:
              </p>
              
              <!-- OTP Code Box -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seu código de verificação</p>
                <p style="margin: 0; color: #059669; font-size: 40px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
              </div>
              
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                ⏱️ Este código expira em <strong>${expiresInMinutes} minutos</strong>.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Se você não solicitou este código, ignore este email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Pare! App. Todos os direitos reservados.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                Este é um email automático, por favor não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Envia email com código OTP
 * @param {string} email - Email do destinatário
 * @param {string} code - Código OTP
 * @param {string} userName - Nome do usuário (opcional)
 */
export const sendOTPEmail = async (email, code, userName = '') => {
  const html = generateOTPEmailTemplate(code, userName, 10);
  
  return sendEmail({
    to: email,
    subject: `${code} é seu código de verificação - Pare!`,
    html,
  });
};

export default {
  initializeEmailService,
  sendEmail,
  sendOTPEmail,
  generateOTPEmailTemplate,
};
