const express = require('express');
const router = express.Router();
const userController = require('../controller/user/userController');
const passport = require('passport');


router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomePage);
router.get('/signup',userController.loadSignup)
router.get('/login',userController.loadLogin);

router.post('/login',userController.login)
router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp);
router.post('/resentOtp',userController.resentOtp);


router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/');
})


module.exports = router;