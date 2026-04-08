const mongoose = require('mongoose');
const Category = require('./models/categorySchema');
require('dotenv').config();

async function checkCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const categories = await Category.find();
        categories.forEach(c => {
             console.log(`Category: ${c.name} - IsListed: ${c.isListed}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCategories();
