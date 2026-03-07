const express = require('express');
const router = express.Router();
const razorPayController = require('../controller/user/razorPayController');
const { userAuth } = require('../middleware/auth');

router.route('/razorpay/orders')
  .post(userAuth, razorPayController.createRazorpayOrder);

router.route('/razorpay/verify')
  .post(userAuth, razorPayController.verifyRazorpayPayment);

router.route('/razorpay/page-order')
  .post(userAuth, razorPayController.createRazorpayPageOrder);

router.route('/razorpay/retry-verify')
  .post(userAuth, razorPayController.verifyRazorpayRetryPayment);

module.exports = router;
