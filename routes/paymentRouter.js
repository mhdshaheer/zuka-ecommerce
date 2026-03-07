const express = require('express');
const router = express.Router();
const razorPayController = require('../controller/user/razorPayController');
const { userAuth } = require('../middlewares/auth');

router.route('/razorpay/orders')
  .post(userAuth, razorPayController.createOrder);

router.route('/razorpay/verify')
  .post(userAuth, razorPayController.verifyPayment);

router.route('/razorpay/page-order')
  .post(userAuth, razorPayController.createOrder_OP);

router.route('/razorpay/retry-verify')
  .post(userAuth, razorPayController.verifyRetryPayment);

module.exports = router;
