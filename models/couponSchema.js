const mongoose = require("mongoose");

const {Schema} = mongoose;

const couponSchema = new mongoose.Schema({
    code:{
        type:String,
        required:true,
        unique:true
    },
    createdOn :{
        type:Date,
        default:Date.now,
        requried:true
    },
    expireOn :{
        type:Date,
        required:true
    },
    discountPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    usageLimit: {
        type: Number,
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0 
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]


})

const Coupon = mongoose.model("Coupon",couponSchema);

module.exports = Coupon;