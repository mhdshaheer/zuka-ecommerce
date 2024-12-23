const express = require("express");
const router = express.Router();
const paymentController = require("../controller/user/razorPayController");

// Create Razorpay order
router.post("/createRazorpayOrder", paymentController.createOrder);

// Verify Razorpay payment
router.post("/verifyRazorpayPayment", paymentController.verifyPayment);

// order Page RazorPay
router.post('/createRazorpayPageOrder',paymentController.createOrder_OP)
router.post('/verifyRazorpayRetryPayment',paymentController.verifyRetryPayment)

module.exports = router;
