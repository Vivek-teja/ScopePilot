const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = require('../src/app');
const env = require('../src/config/env');
const { generateToken } = require('../src/utils/jwt');
const User = require('../src/modules/auth/auth.model');
const { ROLES } = require('../src/constants/roles');
const { requireAuth, requireRole, optionalAuth } = require('../src/middleware/auth.middleware');
const errorHandler = require('../src/middleware/error.middleware');

describe('Authentication & Authorization Module (Task 2)', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();
  const mockClientId = new mongoose.Types.ObjectId().toString();

  const mockFreelancerUser = {
    _id: new mongoose.Types.ObjectId(mockUserId),
    name: 'Alex Developer',
    email: 'alex@scopepilot.dev',
    role: ROLES.FREELANCER,
    isActive: true,
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
      };
    },
    comparePassword: jest.fn(),
  };

  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(mockAdminId),
    name: 'System Admin',
    email: 'admin@scopepilot.dev',
    role: ROLES.ADMIN,
    isActive: true,
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
      };
    },
    comparePassword: jest.fn(),
  };

  const mockClientUser = {
    _id: new mongoose.Types.ObjectId(mockClientId),
    name: 'Sarah Client',
    email: 'sarah@client.dev',
    role: ROLES.CLIENT,
    isActive: true,
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
      };
    },
    comparePassword: jest.fn(),
  };

  const validToken = generateToken({
    id: mockUserId,
    email: mockFreelancerUser.email,
    role: mockFreelancerUser.role,
  });

  const adminToken = generateToken({
    id: mockAdminId,
    email: mockAdminUser.email,
    role: mockAdminUser.role,
  });

  const clientToken = generateToken({
    id: mockClientId,
    email: mockClientUser.email,
    role: mockClientUser.role,
  });

  beforeEach(() => {
    jest.restoreAllMocks();

    // Default mock for User.findById
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id ? id.toString() : '';
      let userObj = null;
      if (idStr === mockUserId) userObj = mockFreelancerUser;
      else if (idStr === mockAdminId) userObj = mockAdminUser;
      else if (idStr === mockClientId) userObj = mockClientUser;

      return {
        select: jest.fn().mockImplementation((fields) => {
          if (fields === '-passwordHash') {
            return Promise.resolve(userObj);
          }
          return Promise.resolve(userObj);
        }),
        then(resolve, reject) {
          return Promise.resolve(userObj).then(resolve, reject);
        },
      };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. REGISTRATION (POST /api/auth/register)
  // =========================================================================
  describe('User Registration (POST /api/auth/register)', () => {
    it('should register a new user with default role "freelancer"', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'hashPassword').mockResolvedValue('hashedPassword123');

      const createdUser = {
        _id: new mongoose.Types.ObjectId(mockUserId),
        name: 'Alex Developer',
        email: 'alex@scopepilot.dev',
        role: ROLES.FREELANCER,
        passwordHash: 'hashedPassword123',
        toObject() {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
          };
        },
      };

      jest.spyOn(User, 'create').mockResolvedValue(createdUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alex Developer',
          email: 'alex@scopepilot.dev',
          password: 'securePassword123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/registered successfully/i);
      expect(res.body.data.user.email).toBe('alex@scopepilot.dev');
      expect(res.body.data.user.role).toBe(ROLES.FREELANCER);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    it('should register a new user with explicit role "client"', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'hashPassword').mockResolvedValue('hashedPassword123');

      const createdUser = {
        _id: new mongoose.Types.ObjectId(mockClientId),
        name: 'Sarah Client',
        email: 'sarah@client.dev',
        role: ROLES.CLIENT,
        passwordHash: 'hashedPassword123',
        toObject() {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
          };
        },
      };

      jest.spyOn(User, 'create').mockResolvedValue(createdUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Client',
          email: 'sarah@client.dev',
          password: 'securePassword123',
          role: ROLES.CLIENT,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.CLIENT);
    });

    it('should return 409 Conflict when email is already registered', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(mockFreelancerUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'alex@scopepilot.dev',
          password: 'securePassword123',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 Bad Request when password is fewer than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password',
          email: 'short@test.dev',
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.some((e) => /at least 6 characters/i.test(e.message))).toBe(true);
    });

    it('should return 400 Bad Request when role is not a recognized system role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Role User',
          email: 'invalid@role.dev',
          password: 'securePassword123',
          role: 'superhero',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // =========================================================================
  // 2. LOGIN (POST /api/auth/login)
  // =========================================================================
  describe('User Login (POST /api/auth/login)', () => {
    it('should login successfully with valid credentials and return JWT token', async () => {
      const mockUserWithPassword = {
        ...mockFreelancerUser,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithPassword),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alex@scopepilot.dev',
          password: 'correctPassword',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/login successful/i);
      expect(res.body.data.user.email).toBe('alex@scopepilot.dev');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 401 Unauthorized when email is not found', async () => {
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@scopepilot.dev',
          password: 'somePassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('should return 401 Unauthorized when password does not match', async () => {
      const mockUserWithWrongPassword = {
        ...mockFreelancerUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithWrongPassword),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alex@scopepilot.dev',
          password: 'wrongPassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    });

    it('should return 400 Bad Request when password field is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alex@scopepilot.dev',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  // =========================================================================
  // 3. AUTHENTICATED PROFILE (GET /api/auth/me)
  // =========================================================================
  describe('Current User Profile (GET /api/auth/me)', () => {
    it('should return 200 OK with authenticated user profile when token is valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('alex@scopepilot.dev');
      expect(res.body.data.role).toBe(ROLES.FREELANCER);
    });

    it('should return 401 Unauthorized when Authorization header is omitted', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    it('should return 404 Not Found if user is removed from database after token issuance', async () => {
      // First requireAuth checks User.findById -> returns user
      // Then authService.getProfile calls User.findById -> returns null
      let callCount = 0;
      jest.spyOn(User, 'findById').mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          // requireAuth check
          return {
            select: jest.fn().mockResolvedValue(mockFreelancerUser),
          };
        }
        // getProfile check
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/User profile not found/i);
    });
  });

  // =========================================================================
  // 4. JWT HANDLING & requireAuth MIDDLEWARE EDGE CASES
  // =========================================================================
  describe('JWT Verification & requireAuth Middleware', () => {
    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Basic ${validToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Missing or invalid Bearer token/i);
    });

    it('should return 401 when Bearer prefix is present but token string is missing', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token/i);
    });

    it('should return 401 with TokenExpiredError message when token has expired', async () => {
      // Generate a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { id: mockUserId, email: mockFreelancerUser.email },
        env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('should return 401 when token has an invalid signature or is tampered', async () => {
      // Sign with a wrong secret
      const forgedToken = jwt.sign(
        { id: mockUserId, email: mockFreelancerUser.email },
        'wrong-secret-key-12345',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid authentication token/i);
    });

    it('should return 401 when token is a completely malformed string', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-even-a-jwt');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid authentication token/i);
    });

    it('should return 401 when user associated with token no longer exists in DB', async () => {
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no longer exists/i);
    });
  });

  // =========================================================================
  // 5. ROLE-BASED AUTHORIZATION MIDDLEWARE (requireRole)
  // =========================================================================
  describe('Role-Based Authorization Middleware (requireRole)', () => {
    let testApp;

    beforeAll(() => {
      // Create a test Express instance mounted with requireRole guards
      testApp = express();
      testApp.use(express.json());

      testApp.get('/admin-only', requireAuth, requireRole(ROLES.ADMIN), (req, res) => {
        res.json({ success: true, message: 'Welcome Admin' });
      });

      testApp.get(
        '/client-or-admin',
        requireAuth,
        requireRole(ROLES.CLIENT, ROLES.ADMIN),
        (req, res) => {
          res.json({ success: true, message: 'Welcome Client or Admin' });
        }
      );

      // Route testing requireRole when req.user is absent
      testApp.get('/no-auth-role', requireRole(ROLES.ADMIN), (req, res) => {
        res.json({ success: true });
      });

      testApp.use(errorHandler);
    });

    it('should grant access when user holds the required role', async () => {
      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Welcome Admin');
    });

    it('should grant access when user holds one of multiple permitted roles', async () => {
      const res = await request(testApp)
        .get('/client-or-admin')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Welcome Client or Admin');
    });

    it('should return 403 Forbidden when user role is not permitted', async () => {
      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${validToken}`); // Freelancer attempting admin route

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden. Access requires one of the following roles/i);
      expect(res.body.message).toMatch(/freelancer/i);
    });

    it('should return 401 Unauthorized when requireRole is called without authenticated user', async () => {
      const res = await request(testApp).get('/no-auth-role');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required/i);
    });
  });

  // =========================================================================
  // 6. OPTIONAL AUTHENTICATION MIDDLEWARE (optionalAuth)
  // =========================================================================
  describe('Optional Authentication Middleware (optionalAuth)', () => {
    let testApp;

    beforeAll(() => {
      testApp = express();
      testApp.use(express.json());

      testApp.get('/public-feed', optionalAuth, (req, res) => {
        res.json({
          success: true,
          authenticated: Boolean(req.user),
          user: req.user ? req.user.email : null,
        });
      });

      testApp.use(errorHandler);
    });

    it('should attach user when a valid Bearer token is provided', async () => {
      const res = await request(testApp)
        .get('/public-feed')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user).toBe('alex@scopepilot.dev');
    });

    it('should proceed anonymously without error when Authorization header is omitted', async () => {
      const res = await request(testApp).get('/public-feed');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });

    it('should proceed anonymously without error when token is invalid or corrupted', async () => {
      const res = await request(testApp)
        .get('/public-feed')
        .set('Authorization', 'Bearer corrupted-token-value');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });
  });

  // =========================================================================
  // 7. PASSWORD HASHING & MODEL SECURITY HELPERS
  // =========================================================================
  describe('User Model Password Security Helpers', () => {
    it('should hash password with bcrypt', async () => {
      const plainPassword = 'SuperSecretPassword!123';
      const hash = await User.hashPassword(plainPassword);

      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('comparePassword method should return true for correct password and false for wrong password', async () => {
      const plainPassword = 'MySecretPassword#2026';
      const hash = await User.hashPassword(plainPassword);

      const userInstance = new User({
        name: 'Hash Test User',
        email: 'hash@test.dev',
        passwordHash: hash,
      });

      const isMatch = await userInstance.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isMismatch = await userInstance.comparePassword('IncorrectPassword!');
      expect(isMismatch).toBe(false);
    });
  });
});
