const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController")
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController');
const {userAuth,adminAuth} = require("../middlewares/auth");



router.get('/adminError',adminController.adminErrorLoad);

//login management
router.get("/login",adminController.loadLogin);
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout);

router.post("/login",adminController.login);


//Customer management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockUser',adminAuth,customerController.blockUser)
router.get('/unBlockUser',adminAuth,customerController.unBlockUser);


//Category Mangement
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.delete('/delete/:id',adminAuth,categoryController.deleteCategory);
router.patch('/addOffer/:id',adminAuth,categoryController.addOffer);
router.patch('/removeOffer/:id',adminAuth,categoryController.removeOffer)
router.put('/editCategory/:id',adminAuth,categoryController.editCategory);

//Product management
// router.get('/products',adminAuth,c);


module.exports = router;