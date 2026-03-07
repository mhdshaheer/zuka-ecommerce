const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController")
const customerController = require('../controller/admin/customerController')
const categoryController = require('../controller/admin/categoryController');
const productController = require('../controller/admin/productController')
const orderController = require('../controller/admin/orderController');
const couponController = require('../controller/admin/couponController');
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
router.get('/customers',adminAuth,customerController.customerInfo)
router.patch('/customers/:id/block',adminAuth,customerController.blockUser)
router.patch('/customers/:id/unblock',adminAuth,customerController.unBlockUser);


//Category Mangement
router.get('/categories',adminAuth,categoryController.categoryInfo);
router.post('/categories',adminAuth,categoryController.addCategory);
router.patch('/categories/:id/offer',adminAuth,categoryController.addOffer);
router.delete('/categories/:id/offer',adminAuth,categoryController.removeOffer);
router.put('/categories/:id',adminAuth,categoryController.editCategory);

//Product management
router.get('/products',adminAuth,productController.loadProduct);
router.post('/products',adminAuth,upload.array('images', 4),productController.addProduct)
router.get('/products/list',adminAuth,productController.productList)
router.put('/products/:id',adminAuth,productController.editProduct);
router.patch('/products/:id/block',adminAuth,productController.blockProduct)
router.patch('/products/:id/unblock',adminAuth,productController.unBlockProduct)
router.patch('/products/:id/images',adminAuth,upload.array('images', 4),productController.updateImages);
router.get('/products/:productId/variants/:variantId/edit',adminAuth,productController.editVariantLoad);
router.put('/products/:productId/variants/:variantId',adminAuth,productController.variantUpdate);
router.patch('/products/:productId/variants/:variantId/block',adminAuth,productController.blockVariant)
router.patch('/products/:productId/variants/:variantId/unblock',adminAuth,productController.unblockVariant);
router.post('/products/:productId/variants',adminAuth,productController.addVariant)




//Orders
router.get('/orders',adminAuth,orderController.loadOrderList);
router.get('/orders/:id',adminAuth,orderController.orderDetails);
router.patch('/orders/:id/status',adminAuth,orderController.changeOrderStatus);


//Coupon management
router.get('/coupons',adminAuth,couponController.loadCouponPage);
router.post('/coupons',adminAuth,couponController.addCoupon);
router.patch('/coupons/:id/block',adminAuth,couponController.blockCoupon)
router.patch('/coupons/:id/unblock',adminAuth,couponController.unBlockCoupon)


//Sales report
router.get('/reports/sales',adminAuth,salesController.loadSalesReportPage)
router.get('/reports/sales/export/excel', adminAuth,salesController.exportExcel);
router.get('/reports/sales/export/pdf', adminAuth,salesController.exportPDF);

module.exports = router;