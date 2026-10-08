const request = require('supertest');
const app = require('../src/app');

describe('Validation Middleware & Error Handling', () => {
  it('should return 400 Bad Request with standardized error structure when validation fails', async () => {
    // Attempting to register with invalid email and short password
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A', // too short (< 2)
        email: 'not-an-email',
        password: '123', // too short (< 6)
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Validation failed');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);

    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('email');
    expect(fields).toContain('password');
  });
});
