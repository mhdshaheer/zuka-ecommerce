const mongoose = require('mongoose');
const env = require('dotenv').config();

const connectDB = async ()=>{
    try {
        await mongoose.conncet(process.env.MONGODB_URI);
        console.log('Mongodb is connected...');
        
    } catch (error) {
        console.log("ERROR in mongodb connection...",error.message);
        process.exit(1);
    }
}

module.exports = connectDB