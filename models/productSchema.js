const mongoose = require('mongoose');
const { Schema } = mongoose;


const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    default: 'ZUKA'
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  regularPrice: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
  },
  offerPrice: {
    type: Number,
    default: 0,
  },
  totalStocks: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  color: {
    type: String,
    required: true, // e.g., "Red", "Blue"
  },
  images: {
    type: [String], // Array of image URLs
  },
  variant: [
    {
      size: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      stock: {
        type: Number,
        required: true,
        min: 0,
      },
      status: {
        type: String,
        required: true,
        enum: ['available', 'out of stock', 'discontinued'],
        default: 'available',
      },
    },
  ],
  isBlocked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["Available", "Out of stock", "Discountinued"],
    required: true,
    default: "Available"
  },
}, { timestamps: true });


const Product = mongoose.model("Product", productSchema);

module.exports = Product;