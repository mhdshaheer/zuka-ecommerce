const logger = require('../../helpers/logger');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const constants = require('../../helpers/constants');

const loadOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    const status = req.query.status || "";
    const sort = req.query.sort || "newest";

    const filter = {};
    if (status) filter.status = status;

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "total-high") sortOption = { finalAmount: -1 };
    else if (sort === "total-low") sortOption = { finalAmount: 1 };

    const ordersList = await Order.find(filter)
      .populate('userId')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    // Process orders to fix "User Not Found" by falling back to address name
    const orders = await Promise.all(ordersList.map(async (order) => {
      const orderData = order.toObject();
      if (!orderData.userId || !orderData.userId.name) {
        try {
          const addressDoc = await Address.findOne(
            { 'address._id': order.address },
            { 'address.$': 1 }
          );
          if (addressDoc && addressDoc.address && addressDoc.address.length > 0) {
            orderData.userNameFallback = addressDoc.address[0].name;
          }
        } catch (error) {
          logger.error("Error fetching fallback name for order:", order._id, error);
        }
      }
      return orderData;
    }));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    if (req.query.ajax === 'true') {
      return res.json({
        orders,
        currentPage: page,
        totalPages,
        status,
        sort
      });
    }

    res.render('orderList', {
      orders,
      currentPage: page,
      totalPages,
      status,
      sort
    });
  } catch (error) {
    res.redirect("/admin/login");
  }
};

const orderDetails = async (req, res) => {
  try {
    const order_id = req.params.id;
    const orders = await Order.findOne({ _id: order_id }).populate('orderedItems.productId');
    if (!orders) {
      return res.status(httpStatusCode.NOT_FOUND).redirect('/admin/orders');
    }
    const addressDoc = await Address.findOne({ userId: orders.userId, 'address._id': orders.address }, { 'address.$': 1 });
    const address = addressDoc && addressDoc.address ? addressDoc.address[0] : null;

    res.render('orderDetails', {
      orders,
      address
    });
  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).redirect('/admin/orders');
  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const order_id = req.params.id;
    const { status } = req.body;

    const order = await Order.findById(order_id);
    if (order && order.paymentStatus === 'Failed') {
      return res.status(httpStatusCode.BAD_REQUEST).json({ 
        success: false, 
        message: "Cannot change status of an order with failed payment." 
      });
    }

    const oldStatus = order.status;
    const result = await Order.updateOne({ _id: order_id }, { $set: { status: status } });
    
    if (result.modifiedCount > 0) {
      if (status === 'Returned' && oldStatus !== 'Returned') {
          const Wallet = require('../../models/walletSchema');
          let wallet = await Wallet.findOne({ userId: order.userId });
          if (!wallet) {
              wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
          }
          wallet.balance += order.finalAmount;
          wallet.transactions.push({
              type: 'refund',
              amount: order.finalAmount,
              description: `Refund for returned order #${order.orderId}`
          });
          await wallet.save();
          
          await Order.updateOne({ _id: order_id }, { $set: { paymentStatus: 'Refunded' } });
      }
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