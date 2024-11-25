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
router.get('/logout',userAuth,userController.logout)

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
router.get('/checkout',userAuth,shopController.loadCheckout)

router.get('/profile',userAuth,userController.loadProfile)
router.get('/address',userAuth,userController.loadAddress)
router.patch('/nameEdit',userController.editName)
router.get('/changePassword',userAuth,userController.loadPassChange)
router.post('/changePass',userController.changePass)

//justcrop
router.get('/crop',userController.cropImage)

module.exports = router;