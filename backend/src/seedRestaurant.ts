import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Restaurant, User } from './models';

dotenv.config();

const seedRestaurant = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('MongoDB Connected');

        // Create or find admin user
        let admin = await User.findOne({ email: 'admin@halkabite.com' });
        if (!admin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            admin = await User.create({
                name: 'Admin User',
                email: 'admin@halkabite.com',
                password: hashedPassword,
                role: 'admin',
                phone: '01700000000',
                isVerified: true
            });
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }

        const restaurant = await Restaurant.create({
            name: 'HalkaBite HQ Kitchen',
            description: 'The official kitchen of HalkaBite.',
            address: {
                street: '123 Food Street',
                city: 'Dhaka',
                state: 'Dhaka',
                zipCode: '1212',
                country: 'Bangladesh'
            },
            phone: '01711223344',
            email: 'kitchen@halkabite.com',
            image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
            cuisine: ['Fast Food', 'Bengali'],
            rating: 5,
            deliveryTime: '30-40 min',
            deliveryFee: 50,
            isOpen: true,
            isActive: true,
            owner: admin._id
        });

        console.log('Restaurant created:', restaurant.name);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding restaurant:', error);
        process.exit(1);
    }
};

seedRestaurant();
