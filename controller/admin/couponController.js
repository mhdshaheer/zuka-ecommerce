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

        console.log("Coupon added successfully")
    } catch (error) {
        console.log(error)
    }
}

module.exports ={
    loadCouponPage,
    addCoupon
}