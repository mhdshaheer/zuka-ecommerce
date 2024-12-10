const express = require("express");
const router = express.Router();
const paymentController = require("../controller/user/razorPayController");

// Create Razorpay order
router.post("/createRazorpayOrder", paymentController.createOrder);

// Verify Razorpay payment
router.post("/verifyRazorpayPayment", paymentController.verifyPayment);

module.exports = router;
