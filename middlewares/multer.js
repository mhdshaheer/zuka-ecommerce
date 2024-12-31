const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product-images',
    allowed_formats: ['jpeg', 'png', 'jpg', 'gif','avif'],
  },
});

const upload = multer({ storage });

module.exports = upload;
