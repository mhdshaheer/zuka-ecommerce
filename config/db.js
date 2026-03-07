const logger = require('../helpers/logger');
const mongoose = require('mongoose');
const env = require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Mongodb is connected...");
  } catch (error) {
    logger.error("ERROR in mongodb connection...", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;