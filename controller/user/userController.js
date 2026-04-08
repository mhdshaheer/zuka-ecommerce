const logger = require('../../helpers/logger');
const constants = require('../../helpers/constants');
const express = require('express');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const bcrypt = require('bcrypt');
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const httpStatusCode = require('../../helpers/httpStatusCode');
const { sendEmailVerify } = require('../../helpers/mail');

//===================================================

//================ sign up ===========================

const loadSignup = async (req, res) => {
  try {
    res.render('signup', { message: "" });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (password != confirmPassword) {
      return res.render("signup", { message: constants.MSG_PASSWORDS_DO_NOT_MATCH });
    }

    const finduser = await User.findOne({ email });
    if (finduser) {
      return res.render("signup", { message: constants.MSG_USER_WITH_THIS_EMAIL_ALREADY_EXIST });
    }

    const otp = generateOtp();
    await sendEmailVerify(email, otp, 'registration');
    
    req.session.userOtp = otp;
    req.session.userData = { name, email, password };
    
    req.session.save((err) => {
      if (err) {
        logger.error("Session save error during signup", err);
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
      }
      res.render("verify-otp");
    });

  } catch (error) {
    logger.error("signup error", error);
    res.render("signup", { message: constants.MSG_AN_ERROR_OCCURED });
  }
};



//=================== login ============================

const loadLogin = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (!user) {
      res.render('login', { message: '' });
    } else {
      res.redirect('/');
    }

  } catch (error) {
    res.redirect('/page_404');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render('login', { message: constants.MSG_USER_NOT_FOUND });
    } else if (findUser.isBlocked) {
      return res.render('login', { message: constants.MSG_USER_IS_BLOCKED_BY_ADMIN });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render('login', { message: constants.MSG_INCORRECT_PASSWORD });
    }

    req.session.user = findUser;
    res.redirect('/');



  } catch (error) {
    res.render('login', { message: constants.MSG_LOGIN_FAILED_PLEASE_TRY_AGAIN_LATER });
  }
};
//===================== logout ============================

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        logger.error("Session destroy error", err.message);
        return res.redirect('/pageNotFound');
      }
      res.redirect('/');
    });

  } catch (error) {
    logger.error("Logout error...", error);
    return res.redirect('/pageNotFound');
  }
};

//===================== otp generation ============================

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//================= sent & resent otp for signUp ================================

const resentOtp = async (req, res) => {
  try {

    const { email } = req?.session?.userData;

    if (!email) {
      return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_EMAIL_NOT_FOUND_IN_SESSION });
    }

    let otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendEmailVerify(email, otp, 'registration');

    if (emailSent) {
      res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_OTP_RESENT_SUCCESSFULLY });
    } else {
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_FAILED_TO_RESENT_OTP_PLEASE_TRY_AGAIN });
    }

  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_INTERNAL_SERVER_ERROR_PLEASE_TRY_AGAIN });
  }
};

// sendEmailVerify is imported from ../../helpers/mail

//==================bcrypt password =====================

const securePassword = async (password) => {
  try {
    const passHash = await bcrypt.hash(password, 10);
    return passHash;
  } catch (error) {

  }
};

//==================== verify otp ========================

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp == req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        password: passwordHash
      });
      await saveUserData.save();

      req.session.user = saveUserData;
      
      // Explicitly save the session before responding to ensure state is synchronized
      req.session.save((err) => {
        if (err) {
          logger.error("Session save error during OTP verification", err);
          return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_AN_ERROR_OCCURED });
        }
        res.json({ success: true, redirectUrl: "/" });
      });

    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_INVALID_OTP_PLEASE_TRY_AGAIN });
    }
  } catch (error) {
    logger.error("Error verifying OTP ", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_AN_ERROR_OCCURED });
  }
};


//================== home page ========================

const loadHomePage = async (req, res) => {
  try {
    const googleUser = req.user;
    req.session.googleUser = googleUser;
    const user = req.session.user || req.session.googleUser;
    if (user?.isBlocked == true) {
      return res.redirect('/login');
    }


    const unblockedCategoryIds = await Category.find({ isListed: false }).select('_id');
    const categoryIds = unblockedCategoryIds.map((category) => category._id);
    const products = await Product.find({
      isBlocked: false,
      category: { $nin: categoryIds },
      variant: { $elemMatch: { isBlocked: false } }
    }).
    limit(8).
    sort({ createdAt: -1 });

    if (user) {
      const userData = await User.findOne({ _id: user._id });
      res.render('home', { user: userData, activePage: 'home', products });
    } else
    {
      return res.render('home', { user, activePage: 'home', products });
    }

  } catch (error) {
    logger.error('Home page not found!', error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
  }

};


//=============== page not found ======================


const pageNotFound = async (req, res) => {
  try {
    res.render('page_404');
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};

//================= end =============================


// ================ Profile -> profile Page ====================================

// profile page
const loadProfile = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    res.render('profile', {
      user,
      activePage: ''
    });
  } catch (error) {
    logger.error(error);
  }
};
//edit user name
const editName = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;

    const { userName } = req.body;
    const result = await User.updateOne({ _id: user._id }, { $set: { name: userName } });
    req.session.user.name = userName;
    res.status(httpStatusCode.OK).json({ success: constants.MSG_PROFILE_NAME_SUCCESSFULLY_EDITED });
    // res.redirect('/profile')
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
//Load passChange page
const loadPassChange = async (req, res) => {
  try {
    const user = req.session.user;
    res.render('passChange', { activePage: '', user });
  } catch (error) {

  }
};

const changePass = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.session.user;
    const userPass = req.session.user.password;
    const compPass = await bcrypt.compare(oldPassword, userPass);
    if (!compPass) {
      return res.status(httpStatusCode.UNAUTHORIZED).json({ message: constants.MSG_PASSWORD_NOT_MATCH });
    }
    const changePass = await securePassword(newPassword);
    await User.updateOne({ _id: user._id }, { $set: { password: changePass } });
    return res.status(httpStatusCode.OK).json({ message: constants.MSG_SUCCESS });
  } catch (error) {
    logger.error("server error", error);
    res.redirect('/pageNotFound');
  }
};
//// ================ Forgot password ====================================

const loadForgotPass = async (req, res) => {
  try {
    const user = req.session.user;
    res.render('forgotPassword', {
      user,
      activePage: ""
    });
  } catch (error) {

  }
};

const sentOtp = async (req, res) => {
  try {
    const { email } = req.body;
    req.session.email = email;
    const findUser = await User.findOne({ email: email });
    
    if (findUser) {
      const otp = generateOtp();
      req.session.forgotOtp = otp;
      req.session.forgotEmail = email; // Store email separately to avoid mixing up with a logged-in session user

      const sentOtp = await sendEmailVerify(email, otp, 'forgot-password');
      if (sentOtp) {
        return res.status(httpStatusCode.OK).json({ message: constants.MSG_SUCCESS });
      }
    } else {
      return res.status(httpStatusCode.UNAUTHORIZED).json({ message: constants.MSG_EMAIL_NOT_MATCH });
    }

  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
const loadForgotOtpVerify = async (req, res) => {
  try {
    res.render('forgotOtpVerify');
  } catch (error) {

  }
};

const verifyForgot = async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp == req.session.forgotOtp) {
      return res.status(httpStatusCode.OK).json({ success: true });
    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_INVALID_OTP_PLEASE_TRY_AGAIN });
    }
  } catch (error) {
    logger.error("Error verifying OTP ", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_AN_ERROR_OCCURED });
  }
};

const resentForgotOtp = async (req, res) => {
  try {

    let otp = generateOtp();
    req.session.forgotOtp = otp;


    const email = req.session.forgotEmail || req.session.email;
    const emailSent = await sendEmailVerify(email, otp, 'forgot-password');

    if (emailSent) {
      res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_OTP_RESENT_SUCCESSFULLY });
    } else {
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_FAILED_TO_RESENT_OTP_PLEASE_TRY_AGAIN });
    }

  } catch (error) {
    logger.error("error resenting otp", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_INTERNAL_SERVER_ERROR_PLEASE_TRY_AGAIN });
  }
};

const newPassSet = async (req, res) => {
  try {
    const user = req.session.user;
    res.render('newPassword', { activePage: "", user });
  } catch (error) {

  }
};
const updatePass = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.session.email;
    const bcryptPass = await securePassword(password);
    const result = await User.updateOne({ email: email }, { $set: { password: bcryptPass } });
    if (result) {
      // req.session.user.password=bcryptPass;
      req.session.destroy();
      res.status(httpStatusCode.OK).json({ message: constants.MSG_PASSWORD_CHANGED_SUCCESSFULLY });
    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ message: constants.MSG_PASSWORD_CHANGE_ERROR });
    }

  } catch (error) {
    logger.error("server error in password changing", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: constants.MSG_SERVER_WHILE_CHANGING_PASSWORD });
  }
};
// ================ Profile -> address ====================================


// Load Address
const loadAddress = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const addressDb = await Address.findOne({ userId: user?._id });
    return res.render('addAddress', {
      user,
      addressDb,
      activePage: ""
    });

  } catch (error) {
    logger.error("error in load address", error);
  }
};

//Add address
const addAddress = async (req, res) => {
  try {
    const address = req.body;
    const addressData = {
      addressType: address.addressType,
      name: address.name,
      country: address.country,
      city: address.city,
      address: address.address,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
      altPhone: address.altPhone
    };
    const user = req.session.user || req.session.googleUser;
    const updateAddress = await Address.findOneAndUpdate(
      { userId: user._id },
      { $push: { address: addressData } },
      { upsert: true, new: true }
    );
    if (updateAddress) {
      res.status(httpStatusCode.OK).json({ success: true });
    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ success: false });
    }
  } catch (error) {
    logger.error("error in adding address", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

//delete address
const softDeleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params; // Changed from index to addressId
    const user = req.session.user || req.session.googleUser;
    
    // Find the address document for the user
    const userAddress = await Address.findOne({ userId: user._id });

    if (!userAddress) {
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: constants.MSG_USER_ADDRESS_DOCUMENT_NOT_FOUND });
    }

    // Find the specific address within the array by its _id
    const addressToUpdate = userAddress.address.id(addressId);

    if (!addressToUpdate) {
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: constants.MSG_ADDRESS_NOT_FOUND });
    }

    // Update the isBlocked status of the specific address
    await Address.updateOne(
      { "address._id": addressId },
      { $set: { "address.$.isBlocked": true } }
    );
    
    res.status(httpStatusCode.OK).json({ success: true });

  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const LoadEditAddress = async (req, res) => {
  try {
    const { addressId } = req.params; // Changed from index to addressId
    const user = req.session.user || req.session.googleUser;
    const userAddress = await Address.findOne({ userId: user._id });
    if(userAddress){
       const oneAddress = userAddress.address.id(addressId); // Find by _id
       if(oneAddress){
         res.render('editAddress', {
           activePage: '',
           user,
           address: oneAddress,
           addressId // Pass addressId for update
         });
       } else {
         res.status(httpStatusCode.NOT_FOUND).send(constants.MSG_ADDRESS_NOT_FOUND);
       }
    } else {
       res.status(httpStatusCode.NOT_FOUND).send(constants.MSG_USER_ADDRESS_DOCUMENT_NOT_FOUND);
    }
  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

//edit Address
const editAddressData = async (req, res) => {
  try {
    const { addressId } = req.params; // Changed from index to addressId
    const user = req.session.user || req.session.googleUser;
    const editedData = req.body.editedData;
    
    const userAddress = await Address.findOne({ userId: user._id });
    if(!userAddress){
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: constants.MSG_USER_ADDRESS_DOCUMENT_NOT_FOUND });
    }

    const addressToUpdate = userAddress.address.id(addressId);
    if(!addressToUpdate){
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: constants.MSG_ADDRESS_NOT_FOUND });
    }

    const result = await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          'address.$.name': editedData.name,
          'address.$.phone': editedData.phone,
          'address.$.altPhone': editedData.altPhone,
          'address.$.addressType': editedData.addressType,
          'address.$.address': editedData.address,
          'address.$.country': editedData.country,
          'address.$.state': editedData.state,
          'address.$.pincode': editedData.pincode,
          'address.$.city': editedData.city
        }
      }
    );
    if (result) {
      res.status(httpStatusCode.OK).json({ success: true });
    } else {
      res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_FAILED_TO_UPDATE_ADDRESS });
    }
  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};


//=============Orders===============
const loadOrders = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;

    //pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const startIndex = (page - 1) * limit;
    const totalOrders = await Order.countDocuments({ userId: user._id });

    const userOrder = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).skip(startIndex).limit(limit).populate({ path: "orderedItems.productId" });

    const userAddress = await Address.findOne({ userId: user._id });

    res.render('orders', {
      activePage: '',
      user,
      userOrder,
      address: userAddress?.address || null,
      totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit)
    });
  } catch (error) {
    logger.error(error);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const user = req.session.user || req.session.googleUser;

    const orders = await Order.findOne({ orderId: orderId });
    if (!orders) {
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: "Order not found" });
    }

    if (orders.paymentStatus === 'Failed') {
      return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: "Cannot cancel order with failed payment status." });
    }

    const result = await Order.updateOne({ orderId: orderId }, {
      $set: {
        status: 'Cancelled',
        cancellationReason: reason
      }
    });

    if (orders.paymentStatus === 'Paid') {
      let transactions = {
        type: 'refund',
        amount: orders.finalAmount
      };
      
      await Wallet.findOneAndUpdate(
        { userId: user._id },
        {
          $inc: { balance: orders.finalAmount },
          $push: { transactions: transactions }
        },
        { upsert: true, new: true }
      );
      
      await Order.updateOne({ orderId: orderId }, { $set: { paymentStatus: 'Refunded' } });
    }

    // Return the stock to database
    for (const item of orders.orderedItems) {
      await Product.updateOne(
        { [`variant._id`]: item.varientId }, 
        { $inc: { 'variant.$.stock': item.quantity } }
      );
    }

    if (result.matchedCount === 0) {
      logger.error("No order found with the specified ID");
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: "Order not found" });
    } else {
      res.status(httpStatusCode.OK).json({ success: true });
    }
  } catch (error) {
    logger.error("Error in cancelOrder:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const user = req.session.user || req.session.googleUser;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: "Order not found" });
    }

    const itemIndex = order.orderedItems.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: "Item not found in order" });
    }

    const item = order.orderedItems[itemIndex];
    if (item.status === 'Cancelled') {
      return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: "Item already cancelled" });
    }

    if (order.paymentStatus === 'Failed') {
        return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: "Cannot cancel item with failed payment status." });
    }

    // Update item status
    order.orderedItems[itemIndex].status = 'Cancelled';
    
    // Check if ALL items are cancelled now?
    const allCancelled = order.orderedItems.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
      order.cancellationReason = "All items cancelled individually: " + reason;
    }

    // Refund if pre-paid (Paid payment status)
    if (order.paymentStatus === 'Paid') {
      // Pro-rate the discount: item's share of the total refund
      const ratio = item.totalPrice / order.totalPrice;
      const itemDiscount = (order.couponDiscount || 0) * ratio;
      const refundAmount = Math.round(item.totalPrice - itemDiscount);
      
      const Wallet = require('../../models/walletSchema');
      await Wallet.findOneAndUpdate(
        { userId: user._id },
        {
          $inc: { balance: refundAmount },
          $push: {
            transactions: {
              type: 'refund',
              amount: refundAmount,
              description: `Refund for cancelled item in order #${order.orderId}`
            }
          }
        },
        { upsert: true }
      );

      // Reduce the order totals
      order.totalPrice -= item.totalPrice;
      order.finalAmount -= refundAmount;
      order.couponDiscount -= itemDiscount;

      // If all items cancelled, mark order as refunded too
      if (allCancelled) {
          order.paymentStatus = 'Refunded';
      }
    }

    // Return stock
    const Product = require('../../models/productSchema');
    await Product.updateOne(
        { [`variant._id`]: item.varientId }, 
        { $inc: { 'variant.$.stock': item.quantity } }
    );

    // Save order
    await order.save();

    res.status(httpStatusCode.OK).json({ success: true, message: "Item cancelled successfully" });

  } catch (error) {
    logger.error("Error in cancelOrderItem:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const updateStatus = await Order.updateOne(
      { orderId: orderId }, 
      { $set: { status: 'Return Request', returnReason: reason } }
    );
    if (updateStatus.modifiedCount > 0) {
      res.status(httpStatusCode.OK).json({ success: true });
    } else {
      res.status(httpStatusCode.NOT_FOUND).json({ success: false, message: "Order not found or already returned." });
    }

  } catch (error) {
    logger.error("Error in returnOrder:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }

};





const invoiceDownload = async (req, res) => {
  try {
    const { orderId } = req.params; // Already using req.params

    // Fetch order and address
    const order = await Order.findOne({ _id: orderId }).populate('orderedItems.productId');
    
    if (!order) {
      return res.status(httpStatusCode.NOT_FOUND).send(constants.MSG_ORDER_NOT_FOUND);
    }

    const address = await Address.findOne({ 'address._id': order.address }, { 'address.$': 1 });
    const myAddress = address ? address.address[0] : null;

    if (!myAddress) {
      return res.status(httpStatusCode.NOT_FOUND).send(constants.MSG_SHIPPING_ADDRESS_NOT_FOUND_FOR_THIS_ORDER);
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${order._id}.pdf`);

    doc.pipe(res);

    // Header Section
    const logoPath = path.join(__dirname, "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 50 });
    }
    doc.fontSize(20).text("Zuka Sports", 50, 57, { align: "right" }).
    fontSize(10).text("21 SM street", 50, 80, { align: "right" }).
    text("Calicut, Kerala, 673602", 50, 95, { align: "right" }).
    text("India", 50, 110, { align: "right" });

    doc.moveDown(2).fontSize(15).text("Invoice", { align: "left", underline: true }).moveDown();

    // Customer and Order Details
    doc.fontSize(12).
    text(`Order ID: ${order.orderId}`, 50, 160, { align: "left" }).
    text(`Payment Method: ${order.paymentMethod}`, 50, 180, { align: "left" }).
    text(`Payment Status: ${order.paymentStatus}`, 50, 200, { align: "left" }).
    text(`Order Status: ${order.status}`, 50, 220, { align: "left" }).
    text(`Total Amount: ₹${order.finalAmount}`, 50, 240, { align: "left" });

    // Shipping Address
    doc.moveDown().fontSize(14).text("Shipping Address:", { underline: true });
    doc.moveDown().fontSize(12).text(`${myAddress.address}, ${myAddress.city}`).
    text(`${myAddress.state}, ${myAddress.country}, ${myAddress.pincode}`).
    text(`Phone: ${myAddress.phone}`);

    // Product Details Table
    const tableTop = doc.y + 10;
    const columnWidths = [50, 150, 50, 50, 50, 70];
    const headers = ["No", "Product Name", "Quantity", "Size", "Price", "Total"];

    headers.forEach((header, i) => {
      doc.font("Helvetica-Bold").text(header, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
        width: columnWidths[i],
        align: i === 0 ? "left" : "center"
      });
    });

    doc.moveDown(0.5).strokeColor("black").lineWidth(1).
    moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let rowY = tableTop + 25;

    order.orderedItems.forEach((item, index) => {
      const values = [
      index + 1,
      item.productId.productName,
      item.quantity,
      item.size || "-",
      item.price.toFixed(2),
      item.totalPrice.toFixed(2)];


      values.forEach((value, i) => {
        doc.font("Helvetica").fontSize(10).text(value, 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), rowY, {
          width: columnWidths[i],
          align: i === 0 ? "left" : "center"
        });
      });

      rowY += 20;
    });

    // Footer Section
    doc.moveDown(2).fontSize(10).text("Thank you for your business!", 50, 780, { align: "center" });

    doc.end();
  } catch (error) {
    logger.error("Error generating invoice:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("An error occurred while generating the invoice.");
  }
};


//==============wallet================

const loadWallet = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const wallet = await Wallet.findOne({ userId: user._id });
    res.render('wallet', {
      activePage: '',
      user,
      wallet
    });
  } catch (error) {
    logger.error(error);

  }
};



const loadOrderDetails = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (!user) {
      return res.redirect('/login');
    }
    const orderId = req.params.id;
    const userId = user._id || user;
    
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.redirect('/page_404');
    }

    const order = await Order.findOne({ _id: orderId, userId: userId }).populate('orderedItems.productId');
    
    if (!order) {
      return res.redirect('/page_404');
    }

    const addressDoc = await Address.findOne(
      { userId: userId, 'address._id': order.address }, 
      { 'address.$': 1 }
    );
    const address = addressDoc && addressDoc.address ? addressDoc.address[0] : null;

    res.render('singleOrderDetails', {
      user,
      order,
      address,
      activePage: 'orders'
    });
  } catch (error) {
    logger.error("Error in loadOrderDetails: %O", error);
    res.redirect('/page_404');
  }
};


module.exports = {
  loadSignup, //load
  loadLogin, //load
  loadHomePage, //load
  pageNotFound,
  verifyOtp,
  resentOtp,
  login,
  logout,
  signup,
  loadProfile, //load
  loadAddress, //load
  editName,

  //password change
  loadPassChange, //load
  changePass,

  //forgot password
  loadForgotPass, //load
  sentOtp,
  loadForgotOtpVerify, //load
  verifyForgot,
  resentForgotOtp,
  newPassSet, //load
  updatePass,

  //address
  addAddress,
  softDeleteAddress,
  LoadEditAddress, //load
  editAddressData,

  //Orders
  loadOrders,
  loadOrderDetails,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  invoiceDownload,

  //wallet
  loadWallet
};