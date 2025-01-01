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

const createOrder = async (req, res) => {
    try {
        console.log("hai")
        const { totalPrice, address, index } = req.body;
        const user = req.session.user || req.session.googleUser;
        const cart = await Cart.findOne({ userId: user._id });
        console.log('total:', totalPrice)

        const order = await razorpay.orders.create({
            amount: totalPrice * 100, // Convert to paise
            currency: "INR",
            receipt: "order_rcptid_11"
        });
        // ===========================
        const priceTotal = Number(totalPrice) + (req.session.discountPrice ?? 0)
        const addOrder = await Order.create({
            cartId: cart._id,
            userId: user._id,
            orderedItems: cart.items,
            totalPrice: priceTotal,
            finalAmount: Number(totalPrice),
            address: address._id,
            index: Number(index),
            paymentMethod: 'Razorpay',
            paymentStatus: 'Pending',
            couponDiscount: req.session.discountPrice || 0,
            couponApplied: req.session.discountPrice ? true : false
        });
        if (addOrder) {
            console.log("added to orders")
            const myOrder = await Order.findOne({ cartId: cart._id })
            const addToCoupon = await Coupon.updateOne(
                { _id: req.session.couponId },
                {
                    $push: { userId: user._id },
                    $inc: { usedCount: 1 }
                }
            )
            console.log('order is :', order)
            req.session.order = myOrder
            cart.items.map(async (item) => {
                let updateStock = await Product.updateOne({ [`variant._id`]: item.varientId }, { $inc: { 'variant.$.stock': -item.quantity } })
            })

            await Cart.deleteOne({ userId: user._id })
            res.status(200).json({
                key: razorpay.key_id,
                order,
                order_id: myOrder._id
            });
        }
        // ===========================
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ error: "Failed to create Razorpay order." });
    }
};

const verifyPayment = async (req, res) => {
    try {

        console.log("verify payment")
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, totalPrice, address, index, order_id } = req.body;
        console.log(req.body)
        console.log("OrderId:", order_id)
        const user = req.session.user || req.session.googleUser;


        const hmac = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (hmac === razorpay_signature) {

            const updateOrder = await Order.updateOne({ _id: order_id }, { $set: { paymentStatus: "Paid" } });

            res.status(200).json({ success: true, orderId: order_id });



        } else {
            res.status(400).json({ success: false });
        }
    } catch (error) {
        console.log(error)
    }
};


//Order page razor pay setup
const createOrder_OP = async (req, res) => {
    try {
        const { finalAmount } = req.body;
        console.log('Final amount:', finalAmount)

        const order = await razorpay.orders.create({
            amount: finalAmount * 100,
            currency: "INR",
            receipt: "order_rcptid_11"
        });

        res.status(200).json({ key: razorpay.key_id, order });

        // ===========================
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ error: "Failed to create Razorpay order." });
    }
};

const verifyRetryPayment = async (req, res) => {
    try {

        console.log("verify payment")
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
        console.log(req.body)
        console.log("OrderId:", order_id)


        const hmac = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (hmac === razorpay_signature) {

            await Order.updateOne({ _id: order_id }, { $set: { paymentStatus: "Paid" } })
            res.status(200).json({ success: true, orderId: order_id });

        } else {
            res.status(400).json({ success: false });
        }
    } catch (error) {
        console.log(error)
    }
};



module.exports = {
    createOrder,
    verifyPayment,
    createOrder_OP,
    verifyRetryPayment
}

