const request = require('supertest');
const app = require('../src/app');

describe('404 Not Found Handling', () => {
  it('should return 404 with standardized error format for undefined routes', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found: [GET] /api/non-existent-endpoint',
      errors: [],
    });
  });
});
