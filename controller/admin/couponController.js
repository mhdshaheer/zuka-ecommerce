const logger = require('../../helpers/logger');
const Coupon = require('../../models/couponSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const constants = require('../../helpers/constants');

const loadCouponPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    const coupon = await Coupon.find().
    skip(skip).
    limit(limit);

    if (req.query.ajax === 'true') {
      return res.json({
        coupon,
        totalPages,
        currentPage: page
      });
    }

    res.render('coupon', { coupon, totalPages, currentPage: page });
  } catch (error) {
    logger.error("Error loading coupon page:", error);
    res.redirect("/admin/login");
  }
};

const addCoupon = async (req, res) => {
  try {
    const { couponCode, minAmount, discountValue, activationDate, expiryDate } = req.body;
    
    // Fix: Properly check if coupon exists
    const findCoupon = await Coupon.findOne({ code: couponCode });
    if (findCoupon) {
      return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_COUPON_ALREADY_EXISTS });
    }

    const coupon = new Coupon({
      code: couponCode,
      createdOn: activationDate,
      expireOn: expiryDate,
      discountPrice: discountValue,
      minimumPrice: minAmount
    });
    await coupon.save();

    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_SUCCESS });
  } catch (error) {
    logger.error("Add coupon error:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const blockCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.updateOne({ _id: couponId }, { $set: { isList: false } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_SUCCESS });
  } catch (error) {
    logger.error("Block coupon error:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};

const unBlockCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.updateOne({ _id: couponId }, { $set: { isList: true } });
    res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_SUCCESS });
  } catch (error) {
    logger.error("Unblock coupon error:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_SERVER_ERROR });
  }
};
module.exports = {
  loadCouponPage,
  addCoupon,
  blockCoupon,
  unBlockCoupon
};