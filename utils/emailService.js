const nodemailer = require('nodemailer');
const TemplateService = require('./templateService');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
      port: process.env.EMAIL_PORT || 2525,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Cancellation feedback email to Support
  async sendCancellationFeedbackToSupport(user, payment) {
    const reason = payment.cancellation_reason || "No specific reason selected";
    const feedback = payment.cancellation_feedback || "No additional text provided";
    const planName = user.plan || "Unknown";

    const subject = `🚨 Subscription Cancelled - ${user.email}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545; text-align: center;">Subscription Cancelled</h1>
        <p>A user has successfully cancelled their subscription via the Stripe Portal.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">User Details:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
          <p><strong>Plan:</strong> ${planName}</p>
        </div>

        <div style="background: #fff3f3; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffcaca;">
          <h3 style="color: #dc3545; margin-top: 0;">Cancellation Feedback:</h3>
          <p><strong>Reason Selected:</strong> ${reason}</p>
          <p><strong>Additional Feedback:</strong><br/>
          ${feedback}</p>
        </div>
      </div>
    `;

    try {
      const mailOptions = {
        from: `"OneChat AI Platform" <${user.email}>`,
        to: "support@onechatai.ai", // Sending to your support team
        subject: subject,
        html: html,
        text: this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Cancellation feedback email sent to support:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Failed to send cancellation feedback email:', error);
    }
  }

async sendEmailTemplate(to, subject, templateName, variables,options = {}) {
    try {
      const html = await TemplateService.loadTemplate(templateName, variables);

      const mailOptions = {
        from: `"OneChat AI Platform" <${process.env.DEFAULT_EMAIL}>`,
        to,
        subject,
        html,
        text: this.stripHtml(html),
        // attachments: [
        //   {
        //     filename: 'logo.png',
        //     path: path.join(__dirname, '..', 'uploads', 'OneChat AI.png'), 
        //     cid: 'logo'  
        //   }
        // ],
         ...options 
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  stripHtml(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, "");  
  }

  // Welcome email template
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to AI SaaS Platform!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to AI SaaS Platform!</h1>
        <p>Hi ${user.name},</p>
        <p>Thank you for joining our AI-powered platform! We're excited to have you on board.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Plan:</strong> ${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</p>
          <p><strong>Available Tokens:</strong> ${user.remaining_tokens}</p>
        </div>

        <h3 style="color: #333;">Getting Started:</h3>
        <ul>
          <li>Explore our AI tools in the dashboard</li>
          <li>Try generating content with our various tools</li>
          <li>Check your usage statistics</li>
          <li>Upgrade your plan for more tokens</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <p>If you have any questions, feel free to reach out to our support team.</p>
        
        <p>Best regards,<br>The AI SaaS Platform Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your AI SaaS Platform account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p><strong>This link will expire in 10 minutes.</strong></p>
        
        <p>If you didn't request this password reset, please ignore this email.</p>
        
        <p>Best regards,<br>The AI SaaS Platform Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Payment confirmation email
  async sendPaymentConfirmationEmail(user, payment, plan) {
    const subject = 'Payment Confirmation - Plan Upgraded';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745; text-align: center;">Payment Successful!</h1>
        <p>Hi ${user.name},</p>
        <p>Thank you for your payment! Your account has been successfully upgraded.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Payment Details:</h3>
          <p><strong>Plan:</strong> ${plan.display_name}</p>
          <p><strong>Amount:</strong> $${payment.amount}</p>
          <p><strong>Transaction ID:</strong> ${payment.transaction_id}</p>
          <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
        </div>

        <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Your New Plan Benefits:</h3>
          <ul>
            ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Start Using Your Plan
          </a>
        </div>

        <p>Best regards,<br>The AI SaaS Platform Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Low tokens warning email
  async sendLowTokensWarningEmail(user) {
    const subject = 'Low Tokens Warning';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ffc107; text-align: center;">Low Tokens Warning</h1>
        <p>Hi ${user.name},</p>
        <p>You're running low on tokens! You currently have <strong>${user.remaining_tokens} tokens</strong> remaining.</p>
        
        <p>To continue using our AI tools without interruption, consider upgrading your plan.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/pricing" 
             style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Upgrade Plan
          </a>
        </div>

        <p>Best regards,<br>The AI SaaS Platform Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  // Admin notification email
  async sendAdminNotificationEmail(subject, message, data = {}) {
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@example.com'];
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Admin Notification</h1>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
        
        ${Object.keys(data).length > 0 ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Additional Data:</h3>
            <pre style="background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ` : ''}
        
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/admin" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Admin Panel
          </a>
        </div>
      </div>
    `;

    const promises = adminEmails.map(email => 
      this.sendEmail(email.trim(), `[AI SaaS] ${subject}`, html)
    );

    return await Promise.allSettled(promises);
  }

  // Child Safety CSAM alert to CEO
  async sendChildSafetyAlertToCEO({ userId, categories, scores, timestamp }) {
    const ceoEmail = process.env.CEO_ALERT_EMAIL || "habib@onechatai.ai";
    const subject = `🚨 URGENT: Child Safety Violation Alert - User ${userId}`;
    const formattedScores = scores ? JSON.stringify(scores, null, 2) : "N/A";
    const eventTime = timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc3545; padding: 20px; border-radius: 8px;">
        <h1 style="color: #dc3545; text-align: center; margin-top: 0;">🚨 URGENT CHILD SAFETY ALERT</h1>
        <p style="font-size: 16px; color: #333;">A severe Content Safety violation (<strong>sexual/minors</strong>) was detected and automatically blocked by the Safety Gate.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Event Summary:</h3>
          <p><strong>Offending User ID:</strong> ${userId}</p>
          <p><strong>Account Action:</strong> User Account Automatically SUSPENDED (status: 'suspended')</p>
          <p><strong>Timestamp (UTC):</strong> ${eventTime}</p>
          <p><strong>Flagged Categories:</strong> ${(categories || []).join(", ")}</p>
        </div>

        <div style="background: #fff3f3; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #ffcaca;">
          <h3 style="color: #dc3545; margin-top: 0;">Category Scores:</h3>
          <pre style="background: #ffffff; padding: 10px; border-radius: 4px; overflow-x: auto;">${formattedScores}</pre>
        </div>

        <p style="font-size: 13px; color: #666; font-style: italic;">
          Note: In accordance with privacy & legal protection standards, raw prompt text and images for child safety violations are omitted from database logs and emails.
        </p>
      </div>
    `;

    try {
      const mailOptions = {
        from: `"OneChat AI Safety System" <${process.env.DEFAULT_EMAIL || "support@onechatai.ai"}>`,
        to: ceoEmail,
        subject: subject,
        html: html,
        text: this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Child safety alert email sent to CEO:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Failed to send child safety alert email:', error.message);
    }
  }
}

module.exports = new EmailService();