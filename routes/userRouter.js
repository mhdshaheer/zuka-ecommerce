const express = require('express');
const router = express.Router();
const userController = require('../controller/user/userController')


router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomePage);
router.get('/signup',userController.loadSignup)
router.get('/login',userController.loadLogin);

router.post('/signup',userController.signup)
router.post('/verify-otp',userController.verifyOtp);
router.post('/resentOtp',userController.resentOtp)


module.exports = router;