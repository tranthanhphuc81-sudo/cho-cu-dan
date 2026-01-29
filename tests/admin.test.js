const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let serverExports;
const User = require('../models/User');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  // Ensure server connects using the in-memory URI
  serverExports = require('../server');
  app = serverExports.app;

  // Wait for mongoose to connect
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear collections
  const collections = Object.keys(mongoose.connection.collections);
  for (const collName of collections) {
    const collection = mongoose.connection.collections[collName];
    try {
      await collection.deleteMany();
    } catch (e) {
      // ignore
    }
  }
});

describe('Admin endpoints', () => {
  test('Admin can get list of users and change role', async () => {
    // Create admin user directly
    const adminData = {
      name: 'Admin Test',
      email: 'admin@test.local',
      password: 'adminpass',
      phone: '0123456789',
      address: { building: 'A', city: 'X' },
      role: 'admin'
    };

    const admin = await User.create(adminData);

    // Login to get token
    const loginResp = await request(app)
      .post('/api/auth/login')
      .send({ email: adminData.email, password: adminData.password });

    expect(loginResp.statusCode).toBe(200);
    const token = loginResp.body.token;
    expect(token).toBeDefined();

    // Create a normal user
    const userData = {
      name: 'Normal',
      email: 'user@test.local',
      password: 'userpass',
      phone: '0987654321',
      address: { building: 'B', city: 'Y' }
    };

    const user = await User.create(userData);

    // Admin gets user list
    const listResp = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResp.body.success).toBe(true);
    expect(Array.isArray(listResp.body.users)).toBe(true);
    expect(listResp.body.users.find(u => u.email === userData.email)).toBeTruthy();

    // Admin updates role of the user
    const updateResp = await request(app)
      .put(`/api/users/${user._id}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'seller' })
      .expect(200);

    expect(updateResp.body.success).toBe(true);
    expect(updateResp.body.user.role).toBe('seller');

    // Admin verifies the user
    const verifyResp = await request(app)
      .put(`/api/users/${user._id}/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true })
      .expect(200);

    expect(verifyResp.body.success).toBe(true);
    expect(verifyResp.body.user.isVerified).toBe(true);
  });
});
