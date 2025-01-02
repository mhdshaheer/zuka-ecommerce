const Coupon = require('../../models/couponSchema')
const loadCouponPage = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; 
      const limit = 8; 
      const skip = (page - 1) * limit;
  
      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit); 
  
      const coupon = await Coupon.find()
        .skip(skip)
        .limit(limit);
  
      res.render('coupon', { coupon, totalPages, currentPage: page });
    } catch (error) {
      console.error("Error loading coupon page:", error);
      res.redirect("/admin/login");
    }
  };
  
const addCoupon = async (req,res)=>{
    try {
        const {couponCode,minAmount,discountValue,activationDate,expiryDate} = req.body;
        const findCoupon = await Coupon.findOne({code:couponCode})
        if(findCoupon){
            res.status(400).json({success:false})
        }
        const coupon = new Coupon({
            code:couponCode,
            createdOn:activationDate,
            expireOn:expiryDate,
            discountPrice:discountValue,
            minimumPrice:minAmount,
        })
        await coupon.save();

        res.status(200).json({success:true})
    } catch (error) {
        
        console.log(error)
    }
}

const blockCoupon = async (req,res)=>{
    try {  
        const {couponId} = req.body;
        await Coupon.updateOne({_id:couponId},{$set:{isList:false}});
        res.status(200).json({success:true})      
    } catch (error) {
        console.log(error)
    }
}
const unBlockCoupon = async (req,res)=>{
    try {  
        const {couponId} = req.body;
        await Coupon.updateOne({_id:couponId},{$set:{isList:true}});
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