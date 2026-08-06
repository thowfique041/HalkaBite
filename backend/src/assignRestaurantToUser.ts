import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Restaurant, User } from './models';

dotenv.config();

const assignRestaurantToUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('✅ MongoDB Connected');

        // UPDATE THIS EMAIL to your current user email
        const userEmail = 'YOUR_EMAIL_HERE';  // ← Change this!

        console.log(`\n🔍 Looking for user: ${userEmail}...`);

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            console.error('❌ User not found! Please update the email in the script.');
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);

        // Update role to 'restaurant'
        if (user.role !== 'restaurant') {
            user.role = 'restaurant';
            await user.save();
            console.log('✅ User role updated to "restaurant"');
        } else {
            console.log('ℹ️  User already has restaurant role');
        }

        // Check if restaurant already exists
        const existingRestaurant = await Restaurant.findOne({ owner: user._id });

        if (existingRestaurant) {
            console.log(`ℹ️  Restaurant already exists: ${existingRestaurant.name}`);
        } else {
            // Create restaurant for the user
            const restaurant = await Restaurant.create({
                name: `${user.name}'s Restaurant`,
                description: 'Welcome to our restaurant! We serve delicious food with love.',
                address: {
                    street: '123 Main Street',
                    city: 'Dhaka',
                    state: 'Dhaka Division',
                    zipCode: '1212',
                    country: 'Bangladesh',
                    coordinates: {
                        lat: 23.8103,
                        lng: 90.4125
                    }
                },
                phone: user.phone || '01711223344',
                email: user.email,
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
                coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
                cuisine: ['Bengali', 'Fast Food', 'Chinese'],
                rating: 4.5,
                reviewCount: 50,
                deliveryTime: '30-45 min',
                deliveryFee: 50,
                minimumOrder: 100,
                isOpen: true,
                isActive: true,
                openingHours: [
                    { day: 'Monday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Tuesday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Wednesday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Thursday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Friday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Saturday', open: '09:00', close: '23:00', isClosed: false },
                    { day: 'Sunday', open: '10:00', close: '22:00', isClosed: false }
                ],
                owner: user._id
            });

            console.log('\n✅ Restaurant created successfully!');
            console.log('   Restaurant Name:', restaurant.name);
            console.log('   Owner:', user.name);
            console.log('   Email:', user.email);
        }

        console.log('\n🎉 DONE! You can now login and access the restaurant dashboard!');
        console.log('   Login Email:', user.email);
        console.log('   Dashboard URL: http://localhost:5174/restaurant-dashboard/menu');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

assignRestaurantToUser();
