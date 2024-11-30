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
router.get('/cart',shopController.loadCart)
router.get('/checkout',shopController.loadCheckout)

router.get('/profile',userController.loadProfile)
router.get('/address',userAuth,userController.loadAddress)
router.patch('/nameEdit',userController.editName)
router.get('/changePassword',userController.loadPassChange)
router.post('/changePass',userController.changePass)


//forgot password
router.get('/forgotPassword',userController.loadForgotPass);
router.post('/sentOtp',userController.sentOtp);
router.get('/forgotOtpVerify',userController.loadForgotOtpVerify);
router.post('/verifyForgot',userController.verifyForgot)
router.post('/resentForgotOtp',userController.resentForgotOtp);
router.get('/newPassSet',userController.newPassSet)
router.patch('/updatePass',userController.updatePass)

//address
router.post('/addAddress',userController.addAddress);
router.delete('/deleteAddress',userController.deleteAddress)


//addtoCart
router.post('/addToCart',shopController.addToCart);
router.delete('/deleteItem',shopController.deleteFromCart)

//justcrop
router.get('/crop',userController.cropImage)

module.exports = router;