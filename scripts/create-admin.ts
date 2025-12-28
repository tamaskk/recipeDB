/**
 * Script to create the first admin user
 * Run with: npx ts-node scripts/create-admin.ts
 */

import mongoose from 'mongoose';
import UserModel from '../models/User';
import ApiKeyModel from '../models/ApiKey';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function createAdmin() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2] || 'admin@recipedb.com';
    const name = process.argv[3] || 'Admin User';
    const password = process.argv[4] || 'admin123456';
    const country = process.argv[5] || 'United States';

    // Check if admin already exists
    const existingAdmin = await UserModel.findOne({ email, isAdmin: true });
    if (existingAdmin) {
      console.log('Admin user already exists:', email);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await UserModel.create({
      email,
      name,
      password: hashedPassword,
      country,
      isActive: true,
      isAdmin: true,
    });

    // Generate API key for admin
    const apiKey = ApiKeyModel.generateKey();
    const apiKeyHash = ApiKeyModel.hashKey(apiKey);

    await ApiKeyModel.create({
      userId: admin._id,
      name: 'Admin API Key',
      key: apiKey,
      keyHash: apiKeyHash,
      isActive: true,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('\nEmail:', admin.email);
    console.log('Name:', admin.name);
    console.log('Password:', password);
    console.log('\n🔑 API Key (save this securely):');
    console.log(apiKey);
    console.log('\n⚠️  This API key will not be shown again!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
