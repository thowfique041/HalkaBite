const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halkabite')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Define schemas
const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
    image: String,
    slug: String,
    isActive: Boolean
}, { timestamps: true });

const foodItemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    image: String,
    images: [String],
    isAvailable: Boolean,
    isVegetarian: Boolean,
    isSpicy: Boolean,
    preparationTime: Number,
    rating: Number,
    reviewCount: Number,
    discount: Number,
    tags: [String]
});

const Category = mongoose.model('Category', categorySchema);
const FoodItem = mongoose.model('FoodItem', foodItemSchema);
const Restaurant = mongoose.model('Restaurant', mongoose.Schema({}, { strict: false }));

async function seedData() {
    try {
        // Get the first restaurant
        const restaurant = await Restaurant.findOne();
        if (!restaurant) {
            console.error('❌ No restaurant found. Please create a restaurant first.');
            process.exit(1);
        }
        console.log(`✅ Using restaurant: ${restaurant.name}`);

        // Categories to create/ensure exist
        const categories = [
            { name: 'Burger', slug: 'burger', description: 'Juicy burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
            { name: 'Pizza', slug: 'pizza', description: 'Delicious pizzas', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80' },
            { name: 'Biryani', slug: 'biryani', description: 'Aromatic biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80' },
            { name: 'Chinese', slug: 'chinese', description: 'Chinese cuisine', image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500&q=80' },
            { name: 'Dessert', slug: 'dessert', description: 'Sweet treats', image: 'https://images.unsplash.com/photo-1563729768-7491b31c7b48?w=500&q=80' },
            { name: 'Drinks', slug: 'drinks', description: 'Refreshing drinks', image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&q=80' }
        ];

        // Create or update categories
        const categoryMap = {};
        for (const catData of categories) {
            let category = await Category.findOne({ slug: catData.slug });
            if (!category) {
                category = await Category.create({ ...catData, isActive: true });
                console.log(`✅ Created category: ${category.name}`);
            } else {
                console.log(`ℹ️  Category already exists: ${category.name}`);
            }
            categoryMap[catData.slug] = category._id;
        }

        // Food items to add
        const foodItems = [
            // Burgers
            {
                name: 'Classic Beef Burger',
                description: 'Juicy beef patty with cheese, lettuce, and tomato',
                price: 250,
                category: categoryMap['burger'],
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
                isVegetarian: false,
                isSpicy: false,
                preparationTime: 15,
                rating: 4.5,
                tags: ['popular', 'classic']
            },
            {
                name: 'Chicken Tikka Burger',
                description: 'Grilled chicken tikka with special sauce',
                price: 280,
                category: categoryMap['burger'],
                image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80',
                isVegetarian: false,
                isSpicy: true,
                preparationTime: 20,
                rating: 4.7,
                tags: ['spicy', 'grilled']
            },
            // Pizzas
            {
                name: 'Margherita Pizza',
                description: 'Classic tomato sauce, mozzarella, and basil',
                price: 350,
                category: categoryMap['pizza'],
                image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80',
                isVegetarian: true,
                isSpicy: false,
                preparationTime: 25,
                rating: 4.6,
                tags: ['vegetarian', 'classic']
            },
            {
                name: 'Pepperoni Pizza',
                description: 'Loaded with pepperoni and extra cheese',
                price: 420,
                category: categoryMap['pizza'],
                image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80',
                isVegetarian: false,
                isSpicy: false,
                preparationTime: 25,
                rating: 4.8,
                tags: ['popular', 'cheesy']
            },
            // Biryanis
            {
                name: 'Chicken Biryani',
                description: 'Aromatic basmati rice with tender chicken pieces',
                price: 320,
                category: categoryMap['biryani'],
                image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
                isVegetarian: false,
                isSpicy: true,
                preparationTime: 30,
                rating: 4.9,
                tags: ['popular', 'spicy', 'traditional']
            },
            {
                name: 'Mutton Biryani',
                description: 'Rich and flavorful mutton biryani with special spices',
                price: 450,
                category: categoryMap['biryani'],
                image: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500&q=80',
                isVegetarian: false,
                isSpicy: true,
                preparationTime: 35,
                rating: 4.8,
                tags: ['premium', 'spicy']
            },
            // Chinese
            {
                name: 'Chicken Fried Rice',
                description: 'Wok-tossed rice with chicken and vegetables',
                price: 280,
                category: categoryMap['chinese'],
                image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80',
                isVegetarian: false,
                isSpicy: false,
                preparationTime: 20,
                rating: 4.5,
                tags: ['popular', 'asian']
            },
            {
                name: 'Chowmein',
                description: 'Stir-fried noodles with vegetables and choice of protein',
                price: 260,
                category: categoryMap['chinese'],
                image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&q=80',
                isVegetarian: false,
                isSpicy: false,
                preparationTime: 18,
                rating: 4.6,
                tags: ['noodles', 'asian']
            },
            // Desserts
            {
                name: 'Chocolate Brownie',
                description: 'Rich chocolate brownie with ice cream',
                price: 180,
                category: categoryMap['dessert'],
                image: 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=500&q=80',
                isVegetarian: true,
                isSpicy: false,
                preparationTime: 10,
                rating: 4.7,
                tags: ['sweet', 'chocolate']
            },
            {
                name: 'Cheesecake',
                description: 'Creamy New York style cheesecake',
                price: 220,
                category: categoryMap['dessert'],
                image: 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=500&q=80',
                isVegetarian: true,
                isSpicy: false,
                preparationTime: 10,
                rating: 4.8,
                tags: ['sweet', 'creamy']
            },
            // Drinks
            {
                name: 'Fresh Lime Soda',
                description: 'Refreshing lime soda with mint',
                price: 80,
                category: categoryMap['drinks'],
                image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80',
                isVegetarian: true,
                isSpicy: false,
                preparationTime: 5,
                rating: 4.4,
                tags: ['refreshing', 'cold']
            },
            {
                name: 'Mango Lassi',
                description: 'Traditional yogurt-based mango drink',
                price: 120,
                category: categoryMap['drinks'],
                image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&q=80',
                isVegetarian: true,
                isSpicy: false,
                preparationTime: 5,
                rating: 4.7,
                tags: ['traditional', 'sweet']
            }
        ];

        // Add restaurant and default values to all food items
        let addedCount = 0;
        for (const item of foodItems) {
            const existing = await FoodItem.findOne({ name: item.name });
            if (!existing) {
                await FoodItem.create({
                    ...item,
                    restaurant: restaurant._id,
                    isAvailable: true,
                    images: [],
                    reviewCount: Math.floor(Math.random() * 50) + 10,
                    discount: 0
                });
                console.log(`✅ Added: ${item.name}`);
                addedCount++;
            } else {
                console.log(`ℹ️  Already exists: ${item.name}`);
            }
        }

        console.log(`\n✅ Seed completed!`);
        console.log(`📊 Added ${addedCount} new food items`);
        console.log(`📊 Total categories: ${categories.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
