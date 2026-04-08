const express = require('express');
const router = express.Router();
const userController = require('../controller/user/userController');
const shopController = require('../controller/user/shopController');
const {userAuth,adminAuth,backToHome} = require("../middlewares/auth");
const passport = require('passport');


router.route('/pageNotFound').get(userController.pageNotFound);
router.route('/').get(userController.loadHomePage);

router.route('/signup')
  .get(backToHome, userController.loadSignup)
  .post(userController.signup);

router.route('/login')
  .get(userController.loadLogin)
  .post(userController.login);

router.route('/logout').get(userController.logout);

router.route('/verify-otp').post(userController.verifyOtp);
router.route('/resend-otp').post(userController.resentOtp);

router.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
  res.redirect('/');
});

// Shop
router.route('/shop').get(shopController.loadShop);
router.route('/products/:id').get(shopController.loadProductInfo);

// Profile & Account
router.route('/profile')
  .get(userAuth, userController.loadProfile)
  .patch(userAuth, userController.editName);

router.route('/profile/password')
  .get(userAuth, userController.loadPassChange)
  .put(userAuth, userController.changePass)
  .patch(userAuth, userController.updatePass);

// Forgot Password
router.route('/forgot-password')
  .get(userController.loadForgotPass)
  .post(userController.sentOtp);

router.route('/forgot-password/verify').post(userController.verifyForgot);
router.route('/forgot-password/resend').post(userController.resentForgotOtp);

// Addresses (support both singular and plural)
router.route(['/address', '/addresses'])
  .get(userAuth, userController.loadAddress)
  .post(userAuth, userController.addAddress);

router.route(['/address/:addressId', '/addresses/:addressId'])
  .get(userAuth, userController.LoadEditAddress)
  .put(userAuth, userController.editAddressData)
  .delete(userAuth, userController.softDeleteAddress);

// Orders
router.route('/orders/view/:id')
  .get(userAuth, userController.loadOrderDetails);

router.route('/orders')
  .get(userAuth, userController.loadOrders)
  .post(userAuth, shopController.addOrder);

router.route('/orders/:id')
  .patch(userAuth, userController.cancelOrder);

router.route('/orders/:id/return')
  .patch(userAuth, userController.returnOrder);

router.route('/orders/:orderId/items/:itemId/cancel')
  .patch(userAuth, userController.cancelOrderItem);

router.route('/orders/:id/invoice')
  .get(userAuth, userController.invoiceDownload);

router.route('/orders/success').get(userAuth, shopController.loadOrderSuccess);

// Wallet
router.route('/wallet').get(userAuth, userController.loadWallet);

// Checkout
router.route('/checkout').get(userAuth, shopController.loadCheckout);

// Cart
router.route('/cart')
  .get(userAuth, shopController.loadCart)
  .patch(userAuth, shopController.editCart);

router.route('/cart/items')
  .post(userAuth, shopController.addToCart);

router.route('/cart/items/:index')
  .delete(userAuth, shopController.deleteFromCart);

router.route('/cart/stock-check').post(userAuth, shopController.manageCartStock);

// Coupons
router.route('/cart/coupon')
  .post(userAuth, shopController.couponApply)
  .delete(userAuth, shopController.removeCoupon);

// Products Stock
router.route('/products/:id/stock').get(userAuth, shopController.getStock);

// Wishlist
router.route('/wishlist')
  .get(userAuth, shopController.loadWishlist)
  .post(userAuth, shopController.addToWishlist);

router.route('/wishlist/:index')
  .delete(userAuth, shopController.deleteFromWishlist);

module.exports = router;