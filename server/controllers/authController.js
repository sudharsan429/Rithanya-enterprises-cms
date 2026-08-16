const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { 
  sendEmail, 
  getRegistrationTemplate, 
  getForgotPasswordTemplate, 
  getChangePasswordTemplate 
} = require('../utils/mailUtils');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ... loginUser remains same ...
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedCanteen: user.assignedCanteen,
        assignedProductionUnit: user.assignedProductionUnit,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Admin/Superadmin/Prod Manager)
const registerUser = async (req, res) => {
  const { name, email, role, assignedCanteen, assignedProductionUnit } = req.body;

  try {
    // 1. Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Role Creation Rules
    const creatorRole = req.user.role;
    let finalRole = role;

    if (creatorRole === 'prod_manager') {
      finalRole = 'salesperson';
    } else if (creatorRole === 'admin') {
      if (role === 'superadmin' || role === 'admin') {
        return res.status(403).json({ message: 'Admins cannot create Superadmins or other Admins' });
      }
    }

    // 3. Generate Random Password
    const randomPassword = crypto.randomBytes(5).toString('hex'); // 10 chars

    const user = await User.create({
      name,
      email,
      password: randomPassword,
      role: finalRole,
      assignedCanteen: (finalRole === 'salesperson' || finalRole === 'prod_manager') ? (assignedCanteen || undefined) : undefined,
      assignedProductionUnit: (finalRole === 'prod_manager') ? (assignedProductionUnit || undefined) : undefined,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });

    if (user) {
      // 4. Send Email
      try {
        await sendEmail({
          email: user.email,
          subject: 'Welcome to Rithanya Enterprises - Account Created',
          html: getRegistrationTemplate(user.name, user.email, randomPassword, user.role)
        });
      } catch (err) {
        console.error('Email failed to send', err);
        // We don't fail user creation if email fails, but maybe we should?
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    if (user.role === 'superadmin' || user.role === 'admin') {
      const resetToken = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3300'}/reset-password/${resetToken}`;
      
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        html: getForgotPasswordTemplate(user.name, resetUrl)
      });

      return res.json({ message: 'Password reset link sent to email' });
    } else {
      user.resetRequested = true;
      await user.save();
      return res.json({ message: 'Password reset request sent to administrator' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adminResetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate Random Password
    const newPassword = crypto.randomBytes(4).toString('hex'); // 8 chars

    user.password = newPassword;
    user.resetRequested = false;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'Account Password Reset - Action Required',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
            <h2>Your Password has been Reset</h2>
            <p>Hello ${user.name},</p>
            <p>An administrator has reset your password. Please use the following credentials to login:</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>New Password:</strong> ${newPassword}</p>
            </div>
            <p>For security, please change your password after logging in.</p>
          </div>
        `
      });
      res.json({ message: 'Password reset and new credentials sent to user', newPassword });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.json({ 
        message: 'Password reset successfully, but email failed to send. Please copy the new password.',
        newPassword 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Successful',
      html: getChangePasswordTemplate(user.name)
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role check: Salesperson cannot change own password
    if (user.role === 'salesperson') {
      return res.status(403).json({ message: 'Access denied. Please contact an administrator to reset your password.' });
    }

    user.password = newPassword;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Password Changed Successfully',
      html: getChangePasswordTemplate(user.name)
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginUser, registerUser, forgotPassword, resetPassword, changePassword, adminResetPassword };
