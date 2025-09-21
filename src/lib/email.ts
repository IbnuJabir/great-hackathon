import { Resend } from 'resend';

// Initialize Resend client with defensive handling
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const resendClient = getResendClient();
    const { data, error } = await resendClient.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email sending failed:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export const emailTemplates = {
  emailVerification: ({
    name,
    verificationUrl,
  }: {
    name: string;
    verificationUrl: string;
  }) => ({
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; padding: 40px 0;">
              <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
              <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px;">Hi ${name}, welcome! Please verify your email address to get started.</p>
              
              <div style="background-color: #f9fafb; padding: 30px; border-radius: 12px; margin: 30px 0;">
                <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">Click the button below to verify your email address:</p>
                <a href="${verificationUrl}" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px;">
                If the button doesn't work, copy and paste this link: <br>
                <span style="word-break: break-all;">${verificationUrl}</span>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  passwordReset: ({
    name,
    resetUrl,
  }: {
    name: string;
    resetUrl: string;
  }) => ({
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; padding: 40px 0;">
              <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
              <p style="color: #6b7280; font-size: 16px; margin-bottom: 30px;">Hi ${name}, we received a request to reset your password.</p>
              
              <div style="background-color: #fef3f2; border: 1px solid #fecaca; padding: 30px; border-radius: 12px; margin: 30px 0;">
                <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 15px;">⚠️ Security Notice</p>
                <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <a href="${resetUrl}" 
                   style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                This link will expire in 1 hour for security reasons.
              </p>
              <p style="color: #9ca3af; font-size: 12px;">
                If the button doesn't work, copy and paste this link: <br>
                <span style="word-break: break-all;">${resetUrl}</span>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};