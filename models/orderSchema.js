const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId:{
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: "Cart",
        required: true
    },
  
    orderedItems: [{

        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        varientId:{
            type:Schema.Types.ObjectId,
            required:true
        },
        price: {
            type: Number,
            default: 0
        },
        size: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            required: true,
            enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
            default:'Pending',
         },
         totalPrice: {
            type: Number,
            required: true
        },

    }],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Credit Card', 'Debit Card', 'Razorpay', 'UPI', 'Wallet'],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending',
    },
    index:{
        type:Number,
    },
    invoiceDate: {
        type: Date
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default:'Pending',
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponDiscount:{
        type:Number,
        default:0
    },
    cancellationReason:{
        type:String
    }
}, { timestamps: true })

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;