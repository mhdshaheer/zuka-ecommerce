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
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { truncateSync } = require('fs-extra');
const env = require("dotenv").config();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const httpStatusCode = require('../../helpers/httpStatusCode');

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
    console.log("Signup attempt - Name:", name, "Email:", email);

    if (password != confirmPassword) {
      console.log("Signup validation failed: Passwords do not match");
      return res.render("signup", { message: constants.MSG_PASSWORDS_DO_NOT_MATCH });
    }

    console.log("Checking for existing user with email:", email);
    const finduser = await User.findOne({ email });
    if (finduser) {
      console.log("Signup failed: User already exists");
      return res.render("signup", { message: constants.MSG_USER_WITH_THIS_EMAIL_ALREADY_EXIST });
    }

    const otp = generateOtp();
    console.log("Generated OTP for:", email);

    console.log("Attempting to send verification email...");
    const emailSent = await sendEmailVerify(email, otp);
    if (!emailSent) {
      console.log("Signup failed: Email could not be sent");
      return res.render("signup", { message: constants.MSG_EMAIL_ERROR });
    }
    
    console.log("Email sent successfully. Storing data in session...");
    req.session.userOtp = otp;
    req.session.userData = { name, email, password };
    
    console.log("Saving session explicitly...");
    // Explicitly save the session before rendering to ensure persistence on hosted platforms
    req.session.save((err) => {
      if (err) {
        console.error("CRITICAL: Session save error during signup:", err);
        logger.error("Session save error during signup", err);
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
      }
      console.log("Session saved successfully. Rendering verify-otp page.");
      res.render("verify-otp");
    });

  } catch (error) {
    console.error("FATAL SIGNUP ERROR:", error);
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
  return Math.floor(100000 + Math.random() * 90000).toString();
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

    const emailSent = await sendEmailVerify(email, otp);

    if (emailSent) {
      res.status(httpStatusCode.OK).json({ success: true, message: constants.MSG_OTP_RESENT_SUCCESSFULLY });
    } else {
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_FAILED_TO_RESENT_OTP_PLEASE_TRY_AGAIN });
    }

  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: constants.MSG_INTERNAL_SERVER_ERROR_PLEASE_TRY_AGAIN });
  }
};

// sent mail to user mail using Multiple HTTP APIs (Resend/Brevo)
async function sendEmailVerify(email, otp) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  try {
    const htmlHeader = `
      <div style="background: linear-gradient(135deg, #000000 0%, #333333 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Zuka Sports</h1>
      </div>
    `;

    const htmlBody = `
      <div style="padding: 50px 40px; text-align: center;">
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">Verify Your Email</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">Use the verification code below to complete your process.</p>
        </div>
        
        <div style="background-color: #f4f7fa; border-radius: 12px; padding: 30px; margin: 30px 0; border: 1px dashed #ced4da;">
          <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #000000; display: block; margin-bottom: 10px; font-family: 'Courier New', Courier, monospace;">${otp}</span>
          <span style="color: #888888; font-size: 14px; text-transform: uppercase; font-weight: 600;">Verification Code</span>
        </div>
        
        <p style="color: #999999; font-size: 14px; line-height: 1.5;">
          This code will expire in <b>10 minutes</b>. <br>
          If you did not request this code, please ignore this email.
        </p>
      </div>
    `;

    const htmlFooter = `
      <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0;">&copy; 2026 Zuka Sports. Premium Athletic Wear.</p>
        <div style="color: #999999; font-size: 13px;">
          Calicut, Kerala, India
        </div>
      </div>
    `;

    const fullHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #eeeeee;">
        ${htmlHeader}
        ${htmlBody}
        ${htmlFooter}
      </div>
    `;

    // 1. TRY RESEND FIRST
    if (RESEND_API_KEY) {
      console.log("INITIALIZING EMAIL FLOW (VIA RESEND API):");
      const response = await axios.post('https://api.resend.com/emails', {
        from: 'Zuka Sports <onboarding@resend.dev>',
        to: email,
        subject: "Verify Your Email - Zuka Sports",
        html: fullHtml
      }, {
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        console.log("EMAIL DISPATCHED SUCCESSFULLY VIA RESEND. ID:", response.data.id);
        return true;
      }
    }

    // 2. TRY BREVO SECOND
    if (BREVO_API_KEY) {
      console.log("INITIALIZING EMAIL FLOW (VIA BREVO API):");
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: "Zuka Sports", email: "onboarding@resend.dev" }, // Fallback email
        to: [{ email: email }],
        subject: "Verify Your Email - Zuka Sports",
        htmlContent: fullHtml
      }, {
        headers: {
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        }
      });

      if (response.status === 201 || response.status === 200) {
        console.log("EMAIL DISPATCHED SUCCESSFULLY VIA BREVO.");
        return true;
      }
    }

    // 3. FALLBACK TO LEGACY (Likely to fail on Render)
    console.warn("No Email API keys found. Attempting legacy SMTP...");
    return await sendEmailLegacy(email, otp);

  } catch (error) {
    const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("EMAIL FLOW FAILURE:", errorData);
    logger.error("Error Sending mail: %s", errorData);
    return false;
  }
}


// Legacy fallback (Original Nodemailer implementation)
async function sendEmailLegacy(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, 
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify Your Email - Zuka Sports",
      text: `Your OTP for Zuka Sports is ${otp}. Please enter this code to verify your email.`,
      html: `OTP: ${otp}` // Simplified for legacy fallback
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("LEGACY EMAIL FAILURE:", error);
    return false;
  }
}

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
      category: { $nin: categoryIds }
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

const loadProductInfo = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (user?.isBlocked == true) {
      return res.redirect('/login');
    }
    const productId = req.params.id.trim();
    const product = await Product.find({ _id: productId });
    const category = await Category.find({ _id: product[0].category });
    const relatedProduct = await Product.find({
      category: product[0].category,
      _id: { $ne: productId },
      isBlocked: false
    }).limit(4);
    res.render('productDetail', {
      product,
      category,
      activePage: '',
      user,
      relatedProduct
    });
  } catch (error) {
    logger.error("error in product info page load", error);
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
    const emailFound = await User.find({ email: email });
    req.session.user = emailFound;
    if (emailFound) {
      const otp = generateOtp();
      req.session.forgotOtp = otp;


      const sentOtp = await sendEmailVerify(email, otp);
      if (sentOtp) {
        res.status(httpStatusCode.OK).json({ message: constants.MSG_SUCCESS });

      }

    } else {
      res.status(httpStatusCode.UNAUTHORIZED).json({ message: constants.MSG_EMAIL_NOT_MATCH });
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


    const email = req.session.user.email;
    const emailSent = await sendEmailVerify(email, otp);

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

const cancelOrder = async (req, res) => {;p;
  try {
    const { orderId, reason } = req.body;
    const user = req.session.user || req.session.googleUser;

    const cancelOrder = await Order.updateOne({ orderId: orderId }, {
      $set: {
        status: 'Cancelled',
        cancellationReason: reason
      }
    });
    const orders = await Order.findOne({ orderId: orderId });

    if (orders.paymentStatus === 'Paid') {
      let transactions = {
        type: 'Refund',
        amount: orders.finalAmount

      };
      const wallet = await Wallet.findOneAndUpdate(
        { userId: user._id },
        {
          $inc: { balance: orders.finalAmount },
          $push: {
            transactions: transactions
          }
        },
        { upsert: true, new: true }
      );
      await Order.updateOne({ orderId: orderId }, { $set: { paymentStatus: 'Refunded' } });
    }

    //Return the stock to dataBase

    orders.orderedItems.map(async (item) => {

      let updateStock = await Product.updateOne({ [`variant._id`]: item.varientId }, { $inc: { 'variant.$.stock': item.quantity } });
      let stock = await Product.findOne({ 'variant._id': item.varientId }, { $lt: { 'variant.stock': 10 } });
      if (stock) {
        await Product.updateOne({ _id: stock._id }, { $set: { productName: "new name" } });
      }
    });
    //=============================
    if (cancelOrder.matchedCount === 0) {
      logger.error("No cart found with the specified ID");
    } else if (cancelOrder.modifiedCount === 0) {
      logger.error("Status was not modified (maybe it was already the same)");
    } else {
      res.status(httpStatusCode.OK).json({ success: true });
    }
  } catch (error) {
    logger.error(error);
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const updateStatus = await Order.updateOne({ orderId: orderId }, { $set: { status: 'Return Request' } });
    if (updateStatus) {
      res.status(httpStatusCode.OK).json({ success: true });
    }

  } catch (error) {
    logger.error(error);
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



module.exports = {
  loadSignup, //load
  loadLogin, //load
  loadHomePage, //load
  loadProductInfo, // Added loadProductInfo
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
  cancelOrder,
  returnOrder,
  invoiceDownload,

  //wallet
  loadWallet
};