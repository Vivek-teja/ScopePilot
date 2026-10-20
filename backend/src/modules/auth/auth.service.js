const User = require('./auth.model');
const ApiError = require('../../utils/apiError');
const { generateToken } = require('../../utils/jwt');
const { validateRealEmail } = require('../../utils/emailValidator');

class AuthService {
  /**
   * Helper to automatically fulfill any pending workspace invitations for a user
   */
  async _fulfillPendingInvitations(user) {
    if (!user || !user.email) return;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return; // Skip when DB is not actively connected (e.g. unit test mocks)
    }
    try {
      const Workspace = require('../workspace/workspace.model');
      const emailLower = user.email.toLowerCase();
      const workspacesWithPendingInvite = await Workspace.find({
        'invitations.email': emailLower,
        'invitations.status': 'pending',
      });

      for (const ws of workspacesWithPendingInvite) {
        let changed = false;
        for (const inv of ws.invitations) {
          if (inv.email && inv.email.toLowerCase() === emailLower && inv.status === 'pending') {
            inv.status = 'accepted';
            changed = true;
            const alreadyMember = ws.members.some((m) => {
              const mId = m.user?._id || m.user;
              return mId && mId.toString() === user._id.toString();
            });
            if (!alreadyMember) {
              ws.members.push({
                user: user._id,
                role: inv.role || 'client',
                joinedAt: new Date(),
              });
            }
          }
        }
        if (changed) {
          await ws.save();
        }
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, role } = userData;

    // Verify email format and ensure it's not a disposable/fake domain
    const emailCheck = await validateRealEmail(email);
    if (!emailCheck.valid) {
      throw ApiError.badRequest(emailCheck.reason);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists.');
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    // Auto-fulfill any pending workspace invitations for this email
    await this._fulfillPendingInvitations(newUser);

    const userObj = newUser.toObject();
    delete userObj.passwordHash;

    const token = generateToken({
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Authenticate user and issue JWT
   */
  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Auto-fulfill any pending workspace invitations upon login
    await this._fulfillPendingInvitations(user);

    const userObj = user.toObject();
    delete userObj.passwordHash;

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Get authenticated user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found.');
    }
    return user;
  }
}

module.exports = new AuthService();
