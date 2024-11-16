const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    name : {
        type:String,
        required:true
    },
    email: {
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    // phone :{
    //     type:String,
    //     required:false,
    //     unique:false,
    //     sparse:true,
    //     default:null
    // },
    googleId : {
        type:String,
        unique:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin : {
        type : Boolean,
        default:false
    },
    // cart:[{
        //     type:Schema.Types.ObjectId,
    //     ref:"Order"
    // }],
    // wallet:{
    //     type:Number,
    //     default:0
    // },
    // wishlist :[{
    //     type:Schema.Types.ObjectId,
    //     ref:'Wishlist'
    // }],
    // orderHistory:[{
    //     type:Schema.Types.ObjectId,
    //     ref:'order'
    // }],
    // referalCode:{
    //     type:String
    // },
    // redeemed:{
    //     type:Boolean,
    // },
    // redeemedUsers:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"user"
    // }],
    // searchHistory:[{
    //     category:{
    //         type:Schema.Types.ObjectId,
    //         ref:"Category"
    //     },
    //     brand:{
    //         type:String
    //     },
    //     searchOn:{
    //         type:Date,
    //         default:Date.now
    //     }
    // }]
},{timestamps:true})

const User = mongoose.model('User',userSchema);

module.exports = User