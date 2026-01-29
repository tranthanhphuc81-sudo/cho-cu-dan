const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
const User = require('../models/User');
const Product = require('../models/Product');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  const serverExports = require('../server');
  app = serverExports.app;

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
  const collections = Object.keys(mongoose.connection.collections);
  for (const collName of collections) {
    const collection = mongoose.connection.collections[collName];
    try { await collection.deleteMany(); } catch (e) { }
  }
});

describe('Resident dashboard /seller products', () => {
  test('Seller can create product and retrieve it via seller endpoint; deletion works', async () => {
    // create user
    const userData = {
      name: 'Seller One',
      email: 'seller1@test.local',
      password: 'sellerpass',
      phone: '012345',
      address: { building: 'S1', city: 'Town' }
    };

    const user = await User.create(userData);

    // login
    const loginRes = await request(app).post('/api/auth/login').send({ email: userData.email, password: userData.password });
    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // create product as seller
    const prodPayload = {
      title: 'Bánh mì ngon',
      description: 'Tươi mỗi sáng',
      category: 'Đồ ăn sáng',
      price: 20000,
      stock: 10,
      deliveryOptions: JSON.stringify(['Tự đến lấy','Giao tận nơi'])
    };

    const createRes = await request(app).post('/api/products').set('Authorization', 'Bearer ' + token).field('title', prodPayload.title).field('description', prodPayload.description).field('category', prodPayload.category).field('price', prodPayload.price).field('stock', prodPayload.stock).field('deliveryOptions', prodPayload.deliveryOptions);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    const createdProduct = createRes.body.product;

    // get products by seller
    const listRes = await request(app).get(`/api/products/seller/${user._id}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.products)).toBe(true);
    expect(listRes.body.products.find(p => p._id === createdProduct._id)).toBeTruthy();

    // delete product
    const delRes = await request(app).delete(`/api/products/${createdProduct._id}`).set('Authorization', 'Bearer ' + token);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.success).toBe(true);

    // ensure it's gone
    const listRes2 = await request(app).get(`/api/products/seller/${user._id}`);
    expect(listRes2.statusCode).toBe(200);
    expect(listRes2.body.products.find(p => p._id === createdProduct._id)).toBeFalsy();
  });
});
