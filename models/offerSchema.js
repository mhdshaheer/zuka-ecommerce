const mongoose = require("mongoose");
const Product = require("./productSchema");

const {Schema} = mongoose;

const offerSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn :{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn :{
        type:Date,
        required:true
    },
    discountPercentage:{
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
    products:[{
        ProductId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product'
        },
        usedCount:{
            type:Number,
            default:0
        }
    }]


})

const Offer = mongoose.model("Offer",offerSchema);

module.exports = Offer;