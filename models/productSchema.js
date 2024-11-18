const mongoose = require('mongoose');
const {Schema} = mongoose;


const productSchema = new Schema({
    productName : {
        type: String,
        required:true,
    },
    description: {
        type :String,
        required:true,
    },
    brand: {
        type:String,
        default:'ZUKA'
    },
    category: {
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer : {
        type:Number,
        default:0,
    },
    totalStocks:{
        type:Number,
        required:true,
        default:0,
        min:0
    },
    variant: {
        type: [
          {
            color: {
              type: String,
              required: true, // e.g., "Red", "Blue"
            },
            images: {
              type: [String], // Array of image URLs
            },
            sizes: {
              type: [
                {
                  size: {
                    type: String,
                    required: true, // e.g., "Small", "Medium", "Large"
                  },
                  price: {
                    type: Number,
                    required: true, // Price for the size
                  },
                  stock: {
                    type: Number,
                    required: true, // Available stock for the size
                    min: 0, // Ensure stock is not negative
                  },
                  status: {
                    type: String,
                    required: true,
                    enum: ['available', 'out of stock', 'discontinued'], // Valid statuses
                    default: 'available',
                  },
                },
              ],
              required: true, // Ensure sizes are provided for a variation
            },
          },
        ],
        required: true, // Ensure variations are provided
      },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out of stock","Discountinued"],
        required:true,
        default:"Available"
    },
},{timestamps:true});


const Product = mongoose.Model("Product",productSchema);

module.exports = Product;