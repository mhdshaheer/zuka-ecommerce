const logger = require('../../helpers/logger');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');

const loadOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;


    const orders = await Order.find().populate('userId').sort({ createdAt: -1 }).skip(skip).limit(limit);

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);
    res.render('orderList', {
      orders,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    res.redirect("/admin/login");
  }
};

const orderDetails = async (req, res) => {
  try {
    const order_id = req.params.id;
    const orders = await Order.findOne({ _id: order_id }).populate('orderedItems.productId');
    const address = await Address.findOne({ userId: orders.userId, 'address._id': orders.address }, { 'address.$': 1 });

    res.render('orderDetails', {
      orders,
      address: address.address[0]
    });
  } catch (error) {
    logger.error(error);

  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const order_id = req.params.id;
    const { status } = req.body;
    const result = await Order.updateOne({ _id: order_id }, { $set: { status: status } });
    if (result) {
      res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_ORDER_STATUS_UPDATED });
    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_FAILED_TO_UPDATE_ORDER_STATUS });
    }

  } catch (error) {
    logger.error("Error in corderChange", error);
  }
};

module.exports = {
  loadOrderList,
  orderDetails,
  changeOrderStatus
};