const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config()
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')
const Coupon = require('../../models/couponSchema')


// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
const createOrder = async (req, res) => {
    try {
        console.log("hai")
        const { totalPrice } = req.body;
        console.log('total:',totalPrice)

        const order = await razorpay.orders.create({
            amount: totalPrice * 100, // Convert to paise
            currency: "INR",
            receipt: "order_rcptid_11"
        });
        res.status(200).json({ key: razorpay.key_id, order });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ error: "Failed to create Razorpay order." });
    }
};

// Verify Razorpay Payment
const verifyPayment = async (req, res) => {
    try {
        
        console.log("verify payment")
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature,totalPrice,address,index } = req.body;
        console.log(req.body)
        const user = req.session.user || req.session.googleUser;
        const cart = await Cart.findOne({ userId: user._id });
    
    
        const hmac = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");
    
        if (hmac === razorpay_signature) {
            const priceTotal = Number(totalPrice)+(req.session.discountPrice??0)
            const addOrder = await Order.create({
                cartId: cart._id,
                userId: user._id,
                orderedItems: cart.items,
                totalPrice:priceTotal,
                finalAmount: Number(totalPrice),
                address: address._id,
                index: Number(index),
                paymentMethod:'Razorpay',
                paymentStatus:'Paid',
                couponDiscount:req.session.discountPrice || 0,
                couponApplied:req.session.discountPrice?true:false
            });
            if (addOrder) {
                console.log("added to orders")
                const order = await Order.findOne({ cartId: cart._id })
                const addToCoupon = await Coupon.updateOne(
                    {_id:req.session.couponId},
                    {
                        $push:{userId:user._id},
                        $inc: { usedCount: 1 }
                    }
                )
                console.log('order is :', order)
                req.session.order = order
                cart.items.map(async (item) => {
                    let updateStock = await Product.updateOne({ [`variant._id`]: item.varientId }, { $inc: { 'variant.$.stock': -item.quantity } })
                })
    
                await Cart.deleteOne({ userId: user._id })
                res.status(200).json({ success: true, orderId: order._id });
            }
    
    
        } else {
            res.status(400).json({ success: false });
        }
    } catch (error) {
        console.log(error)
    }
};

module.exports = {
    createOrder,verifyPayment
}

