const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `"Rithanya Enterprises" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    if (error.code === 'EAUTH') {
      console.error('Email Authentication Failed (EAUTH):');
      console.error('1. Ensure SMTP_USER and SMTP_PASS in server/.env are correct.');
      console.error('2. For Gmail, you MUST use an "App Password", not your regular password.');
      console.error('3. Ensure 2-Step Verification is enabled on your Google account.');
      console.error('See: https://support.google.com/mail/?p=BadCredentials');
    }
    throw error; // Re-throw to be handled by the controller
  }
};

const getRegistrationTemplate = (name, email, password, role) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #111315; border-radius: 28px; color: #f8fafc;">
  <div style="border: 1px solid #2a2f35; border-radius: 28px; padding: 36px 32px; background: #111315;">
    <h2 style="color: #ffffff; margin: 0 0 28px; font-size: 22px; font-weight: 700;">Welcome to Rithanya Enterprises</h2>
    <p style="color: #d1d5db; font-size: 16px; line-height: 24px; margin: 0 0 24px;">Hello ${name},</p>
    <p style="color: #b7bec8; font-size: 16px; line-height: 24px; margin: 0 0 10px;">Your account has been created with the role:</p>
    <div style="margin-bottom: 28px;">
      <span style="display: inline-block; background: #1f2329; color: #ffffff; padding: 8px 14px; border-radius: 10px; font-weight: 700; font-size: 13px; letter-spacing: 0.04em;">
        ${role.replace('_', ' ').toUpperCase()}
      </span>
    </div>
    <p style="color: #b7bec8; font-size: 16px; line-height: 24px; margin: 0 0 20px;">Please use the following credentials to login:</p>
    <div style="background: #1b1d21; padding: 28px; border-radius: 24px; margin: 0 0 28px;">
      <p style="margin: 0; color: #9aa4b2; font-size: 14px;">Email</p>
      <p style="margin: 6px 0 20px; color: #dbeafe; font-weight: 700; font-size: 16px; word-break: break-word;">${email}</p>
      <p style="margin: 0; color: #9aa4b2; font-size: 14px;">Temporary Password</p>
      <p style="margin: 6px 0 0; color: #ffffff; font-weight: 800; font-size: 16px; letter-spacing: 0.18em;">${password}</p>
    </div>
    <p style="color: #d1d5db; font-size: 15px; line-height: 23px; margin: 0;">Please change your password after your first login for security purposes.</p>
  </div>
</div>
`;

const getForgotPasswordTemplate = (name, resetUrl) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background: #ffffff;">
  <h2 style="color: #0f172a; margin-bottom: 24px;">Reset Your Password</h2>
  <p style="color: #475569; font-size: 16px; line-height: 24px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #475569; font-size: 16px; line-height: 24px;">You requested a password reset. Please click the button below to set a new password:</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="${resetUrl}" style="background: #3b82f6; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">Reset Password</a>
  </div>
  <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">If you didn't request this, please ignore this email. The link will expire in 1 hour.</p>
</div>
`;

const getChangePasswordTemplate = (name) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background: #ffffff;">
  <h2 style="color: #0f172a; margin-bottom: 24px;">Password Updated Successfully</h2>
  <p style="color: #475569; font-size: 16px; line-height: 24px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #475569; font-size: 16px; line-height: 24px;">Your account password has been successfully updated. If you did not make this change, please contact administration immediately.</p>
</div>
`;

module.exports = { 
  sendEmail, 
  getRegistrationTemplate, 
  getForgotPasswordTemplate, 
  getChangePasswordTemplate 
};
