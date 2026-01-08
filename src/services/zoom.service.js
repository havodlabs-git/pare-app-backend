import { getFirestore } from '../config/firestore.js';

// Zoom API Service
// Uses Server-to-Server OAuth for creating meetings

class ZoomService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get Firestore instance
  getDb() {
    return getFirestore();
  }

  // Get Zoom config from Firestore
  async getConfig() {
    const db = this.getDb();
    const configDoc = await db.collection('config').doc('zoom').get();
    if (!configDoc.exists) {
      throw new Error('Zoom não configurado');
    }
    return configDoc.data();
  }

  // Save Zoom config to Firestore
  async saveConfig(accountId, clientId, clientSecret) {
    const db = this.getDb();
    await db.collection('config').doc('zoom').set({
      accountId,
      clientId,
      clientSecret,
      updatedAt: new Date()
    });
  }

  // Check if Zoom is configured
  async isConfigured() {
    try {
      const config = await this.getConfig();
      return !!(config.accountId && config.clientId && config.clientSecret);
    } catch {
      return false;
    }
  }

  // Get access token using Server-to-Server OAuth
  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const config = await this.getConfig();
    const { accountId, clientId, clientSecret } = config;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=account_credentials&account_id=${accountId}`
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao obter token do Zoom: ${error.reason || error.message}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Token expires in 1 hour, refresh 5 minutes before
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  // Create a Zoom meeting
  async createMeeting(options) {
    const {
      topic,
      startTime,
      duration = 60, // minutes
      hostEmail,
      agenda = ''
    } = options;

    const token = await this.getAccessToken();

    // Get user ID from email
    const userResponse = await fetch(`https://api.zoom.us/v2/users/${hostEmail}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Profissional não encontrado no Zoom. Verifique o email do Zoom.');
    }

    const userData = await userResponse.json();

    // Create meeting
    const meetingResponse = await fetch(`https://api.zoom.us/v2/users/${userData.id}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone: 'America/Sao_Paulo',
        agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          approval_type: 0, // Automatically approve
          audio: 'both',
          auto_recording: 'none'
        }
      })
    });

    if (!meetingResponse.ok) {
      const error = await meetingResponse.json();
      throw new Error(`Erro ao criar reunião: ${error.message}`);
    }

    const meeting = await meetingResponse.json();

    return {
      meetingId: meeting.id,
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      password: meeting.password,
      hostEmail: hostEmail
    };
  }

  // Delete a Zoom meeting
  async deleteMeeting(meetingId) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      throw new Error(`Erro ao cancelar reunião: ${error.message}`);
    }

    return true;
  }

  // Get meeting details
  async getMeeting(meetingId) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Reunião não encontrada');
    }

    return response.json();
  }
}

export const zoomService = new ZoomService();
export default zoomService;
