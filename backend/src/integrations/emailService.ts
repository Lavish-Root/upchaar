import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.smtp.user && config.smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.smtp.from,
          to,
          subject,
          html,
        });
        console.log(`📧 Email delivered to: ${to} - Subject: ${subject}`);
        return true;
      } else {
        console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to dispatch email:', error);
      return false;
    }
  }

  async sendAppointmentConfirmation(patientEmail: string, patientName: string, doctorName: string, dateTime: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7;">PraanSewa Healthcare - Appointment Confirmed</h2>
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your appointment has been successfully confirmed with <strong>${doctorName}</strong>.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Date & Time:</strong> ${dateTime}</p>
        </div>
        <p>Please log in to your patient portal 10 minutes prior to your appointment time.</p>
        <p style="color: #64748b; font-size: 13px;">PraanSewa Healthcare Platform</p>
      </div>
    `;
    return this.sendEmail(patientEmail, 'Appointment Confirmation - PraanSewa', html);
  }
}

export const emailService = new EmailService();
