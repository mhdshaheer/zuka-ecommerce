const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController")
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController');
const productController = require('../controller/admin/productController')
const orderController = require('../controller/admin/orderController');
const couponController = require('../controller/admin/couponController');
const offerController = require('../controller/admin/offerController');
const salesController = require('../controller/admin/salesController')
const upload = require('../middlewares/multer')
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
router.patch('/addOffer/:id',adminAuth,categoryController.addOffer);
router.patch('/removeOffer/:id',adminAuth,categoryController.removeOffer)
router.put('/editCategory/:id',adminAuth,categoryController.editCategory);

//Product management
router.get('/products',adminAuth,productController.loadProduct);
router.post('/addProduct',adminAuth,upload.array('images', 4),productController.addProduct)
router.get('/productList',productController.productList)
router.put('/editProduct/:id',adminAuth,productController.editProduct);
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unBlockProduct',adminAuth,productController.unBlockProduct)
router.post('/updateImages/:id',adminAuth,upload.array('images', 4),productController.updateImages);
router.get('/editVariant',productController.editVariantLoad);
router.post('/variantUpdate',productController.variantUpdate);
router.patch('/blockVariant/:variantId',productController.blockVariant)
router.patch('/unblockVariant/:variantId',productController.unblockVariant);
router.post('/addVariant',productController.addVariant)

router.get('/manageStock',adminAuth,productController.loadManageStock)
router.patch('/updateStock',productController.updateStock)


//Orders
router.get('/orders',adminAuth,orderController.loadOrderList);
router.get('/orderDetails',adminAuth,orderController.orderDetails);
router.patch('/changeStatus',orderController.changeOrderStatus);


//Coupon management
router.get('/coupon',adminAuth,couponController.loadCouponPage);
router.post('/coupon',couponController.addCoupon);
router.patch('/blockCoupon',couponController.blockCoupon)
router.patch('/unBlockCoupon',couponController.unBlockCoupon)

//Offer management 
router.get('/offer',adminAuth,offerController.loadOfferPage)

//Sales report
router.get('/salesReport',adminAuth,salesController.loadSalesReportPage)
router.get('/salesReport/export/excel', adminAuth,salesController.exportExcel);
router.get('/salesReport/export/pdf', adminAuth,salesController.exportPDF);

module.exports = router;