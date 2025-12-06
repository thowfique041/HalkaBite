const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    image: String,
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

const seedCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const categories = [
            {
                name: 'Burger',
                slug: 'burger',
                description: 'Juicy burgers',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
                isActive: true
            },
            {
                name: 'Pizza',
                slug: 'pizza',
                description: 'Cheesy pizzas',
                image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
                isActive: true
            },
            {
                name: 'Drinks',
                slug: 'drinks',
                description: 'Refreshing drinks',
                image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&q=80',
                isActive: true
            },
            {
                name: 'Dessert',
                slug: 'dessert',
                description: 'Sweet treats',
                image: 'https://images.unsplash.com/photo-1563729768-7491b31c7b48?w=500&q=80',
                isActive: true
            }
        ];

        await Category.deleteMany({}); // Clear existing categories
        await Category.insertMany(categories);

        console.log('Categories seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding categories:', error);
        process.exit(1);
    }
};

seedCategories();
