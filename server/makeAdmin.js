import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.model.js';

dotenv.config();

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'livesync'
    });
    console.log('Connected to DB');

    // Find the first user or you can specify an email
    // Let's just elevate the very first user in the database
    const user = await User.findOne();
    
    if (!user) {
      console.log('No users found in the database. Please register an account first.');
      process.exit(0);
    }

    user.role = 'admin';
    await user.save();

    console.log(`✅ Success! Elevated user to ADMIN.`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Now you can login with this email and your usual password.`);
    console.log(`🚀 Go to http://localhost:5173/admin to test the dashboard.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

makeAdmin();
