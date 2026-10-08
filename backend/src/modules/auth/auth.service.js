const User = require('./auth.model');
const ApiError = require('../../utils/apiError');
const { generateToken } = require('../../utils/jwt');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, role } = userData;

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
