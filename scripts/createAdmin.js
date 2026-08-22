const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

const User = require('../models/User');
const AdminUser = require('../models/AdminUser');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-saas');
    console.log('Connected to MongoDB');

    console.log('\n🔧 Create Admin User\n');

    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User with this email already exists');
      process.exit(1);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      plan: 'pro_max',
      remaining_tokens: 10000000,
      roles: ['Admin'],
      status: 'active',
      emailVerified: true
    });

    // Create admin user record
    await AdminUser.create({
      user_id: user._id,
      role: 'Admin',
      permissions: [
        'view_users', 'edit_users', 'delete_users',
        'view_payments', 'process_refunds',
        'view_analytics', 'edit_tools',
        'manage_ai_providers', 'view_all_history',
        'export_data', 'manage_roles',"manage_seo","manage_news","manage_pages"
      ],
      can_edit_roles: true,
      assigned_by: user._id,
      is_active: true
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${name}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
};

createAdmin();