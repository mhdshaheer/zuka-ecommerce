const express = require('express');
const router = express.Router();
const userController = require('../controller/user/userController');
const shopController = require('../controller/user/shopController');
const {userAuth,adminAuth,backToHome} = require("../middlewares/auth");
const passport = require('passport');


router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomePage);
router.get('/signup',backToHome,userController.loadSignup)
router.get('/login',userController.loadLogin);
router.get('/logout',userController.logout)

router.post('/login',userController.login)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp);
router.post('/resentOtp',userController.resentOtp);


router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/');
})

//shop
router.get('/shop',shopController.loadShop)
router.get('/productInfo',shopController.loadProductInfo);
router.get('/cart',userAuth,shopController.loadCart)
router.get('/checkout',userAuth,shopController.loadCheckout)

router.get('/profile',userAuth,userController.loadProfile)
router.get('/address',userAuth,userController.loadAddress)
router.patch('/nameEdit',userController.editName)
router.get('/changePassword',userAuth,userController.loadPassChange)
router.post('/changePass',userController.changePass)


//forgot password
router.get('/forgotPassword',userController.loadForgotPass);
router.post('/sentOtp',userController.sentOtp);
router.get('/forgotOtpVerify',userAuth,userController.loadForgotOtpVerify);
router.post('/verifyForgot',userController.verifyForgot)
router.post('/resentForgotOtp',userController.resentForgotOtp);
router.get('/newPassSet',userAuth,userController.newPassSet)
router.patch('/updatePass',userController.updatePass)

//address
router.post('/addAddress',userAuth,userController.addAddress);
router.patch('/softDeleteAddress',userAuth,userController.softDeleteAddress);
router.get('/editAddress',userAuth,userController.LoadEditAddress);
router.post('/editAddress',userAuth,userController.editAddressData)

//orders
router.get('/orders',userAuth,userController.loadOrders);
router.patch('/cancelOrder',userAuth,userController.cancelOrder);
router.patch('/returnOrder',userAuth,userController.returnOrder);
router.get('/download-invoice/:orderId', userAuth,userController.invoiceDownload)

// Wallet
router.get('/wallet',userAuth,userController.loadWallet)




//addtoCart
router.post('/addToCart',userAuth,shopController.addToCart);
router.delete('/deleteItem',userAuth,shopController.deleteFromCart)
router.patch('/cart',userAuth,shopController.editCart);
router.post('/couponApply',userAuth,shopController.couponApply);
router.post('/removeCoupon',userAuth,shopController.removeCoupon)
router.post('/getStock',userAuth,shopController.getStock);
router.post('/manageCartStock',userAuth,shopController.manageCartStock)

// Checkout
router.post('/placeOrder',userAuth,shopController.addOrder)
router.get('/orderSuccess',userAuth,shopController.loadOrderSuccess);

// Wishlist
router.get('/wishlist',userAuth,shopController.loadWishlist);
router.post('/wishlist',userAuth,shopController.addToWishlist);
router.delete('/wishlist',userAuth,shopController.deleteFromWishlist)

module.exports = router;