const Coupon = require('../../models/couponSchema')
const loadCouponPage = async (req,res)=>{
    try {
        const coupon = await Coupon.find()
        res.render('coupon',{coupon})
    } catch (error) {
            console.log(error)
    }
}
const addCoupon = async (req,res)=>{
    try {
        const {couponCode,minAmount,discountValue,activationDate,expiryDate} = req.body;
        const coupon = new Coupon({
            code:couponCode,
            createdOn:activationDate,
            expireOn:expiryDate,
            discountPrice:discountValue,
            minimumPrice:minAmount,
        })
        await coupon.save();

        console.log("Coupon added successfully");
        res.status(200).json({success:true})
    } catch (error) {
        console.log(error)
    }
}

const blockCoupon = async (req,res)=>{
    try {  
        const {couponId} = req.body;
        console.log(couponId);
        await Coupon.updateOne({_id:couponId},{$set:{isList:false}});
        console.log("coupon is blocked");
        res.status(200).json({success:true})      
    } catch (error) {
        console.log(error)
    }
}
const unBlockCoupon = async (req,res)=>{
    try {  
        const {couponId} = req.body;
        console.log(couponId);
        await Coupon.updateOne({_id:couponId},{$set:{isList:true}});
        console.log("coupon is unblocked");
        res.status(200).json({success:true})      
    } catch (error) {
        console.log(error)
    }
}
module.exports ={
    loadCouponPage,
    addCoupon,
    blockCoupon,
    unBlockCoupon
}