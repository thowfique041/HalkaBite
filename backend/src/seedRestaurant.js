const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

// Define schemas matching the backend
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'restaurant'], default: 'user' },
    phone: String,
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    phone: String,
    email: String,
    image: { type: String, required: true },
    cuisine: [String],
    rating: Number,
    deliveryTime: String,
    deliveryFee: Number,
    isAvailable: Boolean,
    isOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
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

        // Create restaurant
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
            isAvailable: true,
            isOpen: true,
            isActive: true,
            owner: admin._id
        });

        console.log('Restaurant created:', restaurant.name);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
};

seed();
