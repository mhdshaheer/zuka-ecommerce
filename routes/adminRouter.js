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
router.route('/customers')
  .get(adminAuth, customerController.customerInfo);

router.patch('/customers/:id/block', adminAuth, customerController.blockUser);
router.patch('/customers/:id/unblock', adminAuth, customerController.unBlockUser);

//Category Management
router.route('/categories')
  .get(adminAuth, categoryController.categoryInfo)
  .post(adminAuth, categoryController.addCategory);

router.route('/categories/:id')
  .put(adminAuth, categoryController.editCategory);

router.route('/categories/:id/offer')
  .patch(adminAuth, categoryController.addOffer)
  .delete(adminAuth, categoryController.removeOffer);

//Product management
router.route('/products')
  .get(adminAuth, productController.loadProduct)
  .post(adminAuth, upload.array('images', 4), productController.addProduct);

router.get('/products/list', adminAuth, productController.productList);

router.route('/products/:id')
  .put(adminAuth, productController.editProduct);

router.patch('/products/:id/block', adminAuth, productController.blockProduct);
router.patch('/products/:id/unblock', adminAuth, productController.unBlockProduct);
router.patch('/products/:id/images', adminAuth, upload.array('images', 4), productController.updateImages);

router.route('/products/:productId/variants/:variantId')
  .get(adminAuth, productController.editVariantLoad)
  .put(adminAuth, productController.variantUpdate);

router.patch('/products/:productId/variants/:variantId/block', adminAuth, productController.blockVariant);
router.patch('/products/:productId/variants/:variantId/unblock', adminAuth, productController.unblockVariant);
router.post('/products/:productId/variants', adminAuth, productController.addVariant);

//Orders
router.route('/orders')
  .get(adminAuth, orderController.loadOrderList);

router.route('/orders/:id')
  .get(adminAuth, orderController.orderDetails);

router.patch('/orders/:id/status', adminAuth, orderController.changeOrderStatus);

//Coupon management
router.route('/coupons')
  .get(adminAuth, couponController.loadCouponPage)
  .post(adminAuth, couponController.addCoupon);

router.patch('/coupons/:id/block', adminAuth, couponController.blockCoupon);
router.patch('/coupons/:id/unblock', adminAuth, couponController.unBlockCoupon);

//Sales report
router.route('/reports/sales')
  .get(adminAuth, salesController.loadSalesReportPage);

router.get('/reports/sales/export/excel', adminAuth, salesController.exportExcel);
router.get('/reports/sales/export/pdf', adminAuth, salesController.exportPDF);

module.exports = router;