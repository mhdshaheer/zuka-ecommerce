const express = require('express');
const router = express.Router();
const userController = require('../controller/user/userController');
const shopController = require('../controller/user/shopController');
const {userAuth,adminAuth} = require("../middlewares/auth");
const passport = require('passport');


router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomePage);
router.get('/signup',userController.loadSignup)
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
router.post('/addAddress',userController.addAddress);
router.delete('/deleteAddress',userController.deleteAddress);
router.get('/editAddress',userAuth,userController.LoadEditAddress);
router.post('/editAddress',userController.editAddressData)

//orders
router.get('/orders',userAuth,userController.loadOrders);
router.patch('/cancelOrder',userController.cancelOrder);
router.patch('/returnOrder',userController.returnOrder)

// Wallet
router.get('/wallet',userController.loadWallet)




//addtoCart
router.post('/addToCart',shopController.addToCart);
router.delete('/deleteItem',shopController.deleteFromCart)
router.patch('/cart',shopController.editCart);
router.post('/couponApply',shopController.couponApply)

// Checkout
router.post('/placeOrder',shopController.addOrder)
router.get('/orderSuccess',userAuth,shopController.loadOrderSuccess);

// Wishlist
router.get('/wishlist',userAuth,shopController.loadWishlist);
router.post('/wishlist',shopController.addToWishlist);
router.delete('/wishlist',shopController.deleteFromWishlist)

//justcrop
router.get('/crop',userController.cropImage)

module.exports = router;