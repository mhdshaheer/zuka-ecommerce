const logger = require('../../helpers/logger');
const constants = require('../../helpers/constants');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const mongoose = require('mongoose');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const httpStatusCode = require('../../helpers/httpStatusCode');
const HttpStatusCode = require('../../helpers/httpStatusCode');

const loadShop = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (user?.isBlocked) return res.redirect('/login');

    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';
    const sort = req.query.sort || '';
    const categoryId = req.query.category || '';


    const listedCategories = await Category.find({ isListed: true }).select('_id');
    const categoryIds = listedCategories.map((category) => category._id);
    
    let query = { 
      isBlocked: false, 
      category: { $in: categoryIds },
      variant: { $elemMatch: { isBlocked: { $ne: true } } }
    };

    if (search) {
      query.productName = { $regex: new RegExp(search, 'i') };
    }

    if (categoryId) {
      // If a specific category is requested, ensure it's among the listed ones
      if (categoryIds.some(id => id.toString() === categoryId)) {
        query.category = categoryId;
      } else {
        // If they requested a blocked category, return no results
        query.category = new mongoose.Types.ObjectId(); 
      }
    }

    let sortOptions = {};
    switch (sort) {
      case 'new-arrival':
        sortOptions = { createdAt: -1 };
        break;
      case 'low-to-high':
        sortOptions = { regularPrice: 1 };
        break;
      case 'high-to-low':
        sortOptions = { regularPrice: -1 };
        break;
      case 'a-z':
        sortOptions = { productName: 1 };
        break;
      case 'z-a':
        sortOptions = { productName: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [products, totalProducts, category] = await Promise.all([
      Product.find(query).
      populate('category').
      sort(sortOptions).
      skip(skip).
      limit(limit),
      Product.countDocuments(query),
      Category.find({ isListed: true }) // Only show listed categories in sidebar
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    if (req.query.ajax) {
      return res.json({
        products,
        totalProducts,
        totalPages,
        currentPage: page,
        search,
        sort,
        categoryId
      });
    }

    res.render('shop', {
      activePage: 'shop',
      products,
      category,
      user,
      currentPage: page,
      totalPages,
      page,
      limit,
      totalProducts,
      search,
      sort,
      categoryId
    });

  } catch (error) {
    logger.error("error in shop page", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).render('page_404', { message: constants.MSG_INTERNAL_SERVER_ERROR });
  }
};

const loadProductInfo = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    if (user?.isBlocked == true) {
      return res.redirect('/login');
    }
    const productId = req.params.id;
    const productData = await Product.findOne({
      _id: productId,
      isBlocked: false,
      variant: { $elemMatch: { isBlocked: false } }
    });
    if (!productData) {
      return res.redirect('/shop');
    }
    const product = [productData];
    const category = await Category.find({ _id: productData.category });
    const relatedProduct = await Product.find({
      category: productData.category,
      _id: { $ne: productId },
      isBlocked: false,
      variant: { $elemMatch: { isBlocked: false } }
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

const loadCart = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const cartItem = await Cart.findOne({ userId: user._id });
    const newCart = await Cart.findOne({ userId: user._id }).populate('items.productId');
    //=====================================================================        
    const total = cartItem?.items.reduce((acc, curr) => {
      return acc + curr.totalPrice;
    }, 0) ?? 0;

    const currentDate = new Date();
    const coupons = await Coupon.find({ expireOn: { $gte: currentDate }, userId: { $nin: [user._id] }, isList: true });


    res.render('shopingCart', {
      activePage: 'cart',
      user,
      cartItem: newCart?.items,
      total,
      cart: newCart,
      coupons,
      isCouponApplied: req.session.discountPrice || 0,
      couponMin: req.session.minimumPrice || 0,
      couponCode: req.session.code
    });
  } catch (error) {
    logger.error(error);
  }
};

const loadCheckout = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const userAddress = await Address.findOne({ userId: user._id });
    const userCart = await Cart.findOne({ userId: user._id }).populate('items.productId');
    if (!userCart || userCart.items.length === 0) {
      return res.redirect('/cart');
    }
    
    // Check if any product, category, or VARIANT in the cart is blocked
    const unblockedCategoryIds = await Category.find({ isListed: false }).select('_id');
    const blockedCategoryIds = unblockedCategoryIds.map((category) => category._id.toString());
    
    const isAnyBlocked = userCart.items.some((item) => {
        // Category check
        const isCatBlocked = blockedCategoryIds.includes(item.productId.category.toString());
        // Product parent check
        const isProdBlocked = item.productId.isBlocked;
        // Variant specific check
        const variantFound = item.productId.variant.id(item.varientId);
        const isVarBlocked = variantFound ? variantFound.isBlocked : true; // Treat missing variant as blocked
        
        return isCatBlocked || isProdBlocked || isVarBlocked;
    });

    if (isAnyBlocked) {
        return res.redirect('/cart'); // Send them back to cart to see what's wrong
    }

    const wallet = await Wallet.findOne({ userId: user._id });

    res.render('checkout', {
      activePage: "",
      user,
      userAddress,
      userCart: userCart || { items: [] },
      wallet,
      couponDiscount: req.session.discountPrice || 0,
      couponMin: req.session.minimumPrice || 0
    });
  } catch (error) {
    logger.error(error);

  }
};

const couponApply = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const user = req.session.user || req.session.googleUser;
    const currentDate = new Date();
    const coupon = await Coupon.findOne({ code: couponCode });
    const userCoupon = await Coupon.findOne({ code: couponCode, userId: { $elemMatch: { $eq: user._id } } });
    if (!coupon) {
      req.session.coupon = 0;
      req.session.discountPrice = 0;
      return res.status(httpStatusCode.PAYMENT_REQUIRED).json({ message: constants.MSG_COUPON_IS_INVALID });
    }
    if (currentDate > coupon.expireOn) {
      return res.status(httpStatusCode.PAYMENT_REQUIRED).json({ message: constants.MSG_COUPON_IS_EXPIRED });
    }
    if (userCoupon) {
      req.session.coupon = 0;
      req.session.discountPrice = 0;
      return res.status(httpStatusCode.PAYMENT_REQUIRED).json({ message: constants.MSG_COUPON_IS_ALREADY_USED });
    }

    req.session.discountPrice = coupon.discountPrice;
    req.session.minimumPrice = coupon.minimumPrice;
    req.session.couponId = coupon._id;
    req.session.code = coupon.code;

    res.status(httpStatusCode.OK).json({ success: true, coupon });
  } catch (error) {
    logger.error(error);
  }
};

const removeCoupon = async (req, res) => {
  try {
    req.session.discountPrice = 0;
    req.session.minimumPrice = 0;
    req.session.couponId = null;
    req.session.code = null;
    res.status(httpStatusCode.OK).json({ message: constants.MSG_SUCCESS });
  } catch (error) {
    logger.error("Error in coupon remove from the cart", error);
  }
};

const addToCart = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    let { size, stock, productObj, quantity } = req.body;
    if (!user) {
      return res.status(httpStatusCode.NOT_FOUND).json({ message: constants.MSG_USER_NOT_FOUND });
    }

    const sizeFound = await Cart.findOne({ userId: user._id, 'items.size': size, 'items.productId': productObj._id });

    // For getting varienty id of the perticular varient
    const varientDetail = await Product.findOne({ _id: productObj._id, "variant.size": size }, { 'variant.$': 1 });


    // manage duplicate adding to cart
    if (sizeFound) {
      return res.status(httpStatusCode.NOT_FOUND).json({ itemFound: 1 });


    } else {
      let lastPrice = productObj.offerPrice !== 0 ? productObj.offerPrice : productObj.regularPrice; //edit

      const itemData = {
        productId: productObj._id,
        varientId: varientDetail.variant[0]._id,
        quantity: Number(quantity),
        price: lastPrice,
        size,
        totalPrice: Number(quantity) * Number(lastPrice)

      };
      const toCart = await Cart.findOneAndUpdate(
        { userId: user._id },
        { $push: { items: itemData } },
        { upsert: true, new: true }
      );
      if (toCart) {
        res.status(httpStatusCode.OK).json({ message: constants.MSG_SUCCESS, cartCount: toCart.items.length });
      }
    }
  } catch (error) {
    logger.error(error);

  }
};


const deleteFromCart = async (req, res) => {
  try {
    const { index } = req.params;
    const user = req.session.user || req.session.googleUser;
    const cart = await Cart.findOne({ userId: user._id }, { items: 1 });
    cart.items.splice(Number(index), 1);

    const result = await Cart.updateOne({ userId: user._id }, { $set: { items: cart.items } });
    const cartItems = await Cart.find({ userId: user._id });

    if (result) {
      res.status(httpStatusCode.OK).json({ 
        message: constants.MSG_SUCCESS, 
        cartItems, 
        cartCount: cartItems[0] ? cartItems[0].items.length : 0 
      });
    }

  } catch (error) {
    logger.error(error);
  }
};

const getStock = async (req, res) => {
  const { variantId } = req.body;
  const product = await Product.findOne({ 'variant._id': variantId }, { 'variant.$': 1 });
  const variantStock = product?.variant[0]?.stock;
  return res.status(httpStatusCode.OK).json({ variantStock });
};
//Orders

const addOrder = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const { totalPrice, address, paymentMethod, index } = req.body;
    const userWallet = await Wallet.findOne({ userId: user._id });

    // Get cart content
    const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: constants.MSG_CART_NOT_FOUND });
    }

    // Block checks (Product, Category, and specific Variant)
    const unblockedCategoryIds = await Category.find({ isListed: false }).select('_id');
    const blockedCategoryIds = unblockedCategoryIds.map((category) => category._id.toString());
    
    const isAnyStatusBlocked = cart.items.some((item) => {
        const isCatBlocked = blockedCategoryIds.includes(item.productId.category.toString());
        const isProdBlocked = item.productId.isBlocked;
        const variantObj = item.productId.variant.id(item.varientId);
        const isVarBlocked = variantObj ? variantObj.isBlocked : true;
        
        return isCatBlocked || isProdBlocked || isVarBlocked;
    });

    if (isAnyStatusBlocked) {
      return res.status(httpStatusCode.UNAUTHORIZED).json({
        message: "Your cart contains blocked products, categories, or variants. Please remove them to proceed."
      });
    }

    const totalDiscount = req.session.discountPrice || 0;
    const finalAmountOverall = totalPrice - totalDiscount;

    // Balance check for Wallet
    if (paymentMethod === 'Wallet') {
      if (userWallet.balance < finalAmountOverall) {
        return res.status(httpStatusCode.PAYMENT_REQUIRED).json({ message: constants.MSG_INSUFFICIENT_BALANCE_TO_PROCESS_THE_TRANSACTION });
      }
    }

    const itemCount = cart.items.length;
    const equalDiscountPerItem = totalDiscount / itemCount;

    let lastCreatedOrderId = null;

    // Loop through each item to create separate orders
    for (const item of cart.items) {
      const itemFinalDiscount = equalDiscountPerItem;
      const itemFinalAmount = item.totalPrice - itemFinalDiscount;

      const newOrder = await Order.create({
        userId: user._id,
        orderedItems: [item],
        totalPrice: item.totalPrice,
        finalAmount: itemFinalAmount,
        address: address._id,
        index: Number(index),
        paymentMethod,
        couponDiscount: itemFinalDiscount,
        couponApplied: totalDiscount > 0,
        paymentStatus: paymentMethod === 'Wallet' ? 'Paid' : 'Pending'
      });

      lastCreatedOrderId = newOrder._id;

      // Reduce stocks
      await Product.updateOne({ [`variant._id`]: item.varientId }, { $inc: { 'variant.$.stock': -item.quantity } });
    }

    // Coupon logic
    if (req.session.couponId) {
      await Coupon.updateOne(
        { _id: req.session.couponId },
        { $push: { userId: user._id }, $inc: { usedCount: 1 } }
      );
    }

    // Debit Wallet if applicable
    if (paymentMethod === 'Wallet') {
      const transactions = {
        type: 'debit',
        amount: finalAmountOverall
      };
      await Wallet.findOneAndUpdate(
        { userId: user._id },
        {
          $inc: { balance: -finalAmountOverall },
          $push: { transactions: transactions }
        },
        { upsert: true, new: true }
      );
    }

    await Cart.deleteOne({ userId: user._id });
    
    // Clear session coupon
    req.session.discountPrice = 0;
    req.session.couponId = null;

    res.status(httpStatusCode.OK).json({ orderId: lastCreatedOrderId });

  } catch (error) {
    logger.error("Error in split-order addOrder:", error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const loadOrderSuccess = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    let orderId = req.query.id;
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res.redirect('/shop');
    }
    const findAddress = await Address.findOne({ userId: user._id, 'address._id': order.address }, { 'address.$': 1 });


    res.render('orderSuccess', {
      activePage: '',
      user,
      order,
      address: findAddress ? findAddress.address[0] : null
    });
  } catch (error) {
    logger.error(error);
    res.redirect('/shop');
  }
};

const editCart = async (req, res) => {
  try {
    const { itemIndex, itemId, cartId, quantity, regularPrice } = req.body;

    let total = Number(quantity) * Number(regularPrice);
    const result = await Cart.updateOne({ _id: cartId, 'items._id': itemId }, {
      $set: {
        [`items.${itemIndex}.quantity`]: Number(quantity),
        [`items.${itemIndex}.totalPrice`]: total
      }
    });
    const userCart = await Cart.findOne({ _id: cartId });
    const totalSum = userCart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (result.matchedCount === 0) {
      logger.error("No cart found with the specified ID");
    } else if (result.modifiedCount === 0) {
      logger.error("Quantity was not modified (maybe it was already the same)");
    } else {
      return res.status(httpStatusCode.OK).json({ success: true, totalSum });
    }
  } catch (error) {
    logger.error(error);

  }
};

const loadWishlist = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const wishlist = await Wishlist.findOne({ userId: user._id }).populate('products.productId');
    res.render('wishlist', {
      activePage: '',
      wishProducts: wishlist ? wishlist.products : [],
      user
    });
  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).render('page_404', { message: constants.MSG_INTERNAL_SERVER_ERROR });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const user = req.session.user || req.session.googleUser;
    const { productId } = req.body;
    let wishlistExist = await Wishlist.findOne({ userId: user._id });

    if (wishlistExist) {
        const isIncluded = wishlistExist.products.some((item) =>
            item.productId.equals(new mongoose.Types.ObjectId(productId))
        );

        if (isIncluded) {
            // Remove from wishlist (toggle off)
            const updatedWishlist = await Wishlist.findOneAndUpdate(
                { userId: user._id },
                { $pull: { products: { productId: productId } } },
                { new: true }
            );
            return res.status(httpStatusCode.OK).json({ 
                success: true, 
                added: false, 
                message: "Removed from Wishlist", 
                wishlistCount: updatedWishlist.products.length 
            });
        }
    }

    // Add to wishlist (toggle on)
    const addWishlist = await Wishlist.findOneAndUpdate(
      { userId: user._id },
      {
        $push: {
          products: {
            productId: productId,
            addedOn: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
    if (addWishlist) {
      res.status(httpStatusCode.OK).json({ 
        success: true, 
        added: true, 
        message: "Added to Wishlist", 
        wishlistCount: addWishlist.products.length 
      });
    }
  } catch (error) {
    logger.error(error);
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

const deleteFromWishlist = async (req, res) => {
  try {

    const user = req.session.user || req.session.googleUser;
    const { index } = req.params;
    const wishlist = await Wishlist.findOne({ userId: user._id });
    wishlist.products.splice(index, 1);
    const removeItem = await Wishlist.updateOne({ userId: user._id }, { $set: { products: wishlist.products } });
    if (removeItem) {
      return res.status(httpStatusCode.OK).json({ success: true });
    }

  } catch (error) {
    logger.error(error);
  }
};

const manageCartStock = async (req, res) => {
  try {
    const { userId } = req.body;

    const userCart = await Cart.findOne({ userId: userId }, { items: 1 }).populate('items.productId');
    
    // 1. Check for Blocked Status (Product, Category, or Variant)
    const unblockedCategoryIds = await Category.find({ isListed: false }).select('_id');
    const blockedCategoryIds = unblockedCategoryIds.map((category) => category._id.toString());

    for (const item of userCart.items) {
        const isCatBlocked = blockedCategoryIds.includes(item.productId.category.toString());
        const isProdBlocked = item.productId.isBlocked;
        const variantObj = item.productId.variant.id(item.varientId);
        const isVarBlocked = variantObj ? variantObj.isBlocked : true;

        if (isCatBlocked || isProdBlocked || isVarBlocked) {
            return res.status(httpStatusCode.UNAUTHORIZED).json({ 
                message: `The product '${item.productId.productName}' (Size: ${item.size}) is currently unavailable. Please remove it from your cart.` 
            });
        }
    }

    // 2. Check for Stock
    for (const item of userCart.items) {
      const stockCheck = await Product.findOne(
        {
          _id: item.productId,
          variant: {
            $elemMatch: {
              size: item.size,
              stock: { $lt: item.quantity }
            }
          }
        },
        { 'variant.$': 1 }
      );

      if (stockCheck) {
        let message = `Product ${item.productId.productName} with size '${item.size}' has only ${stockCheck.variant[0].stock} stocks left.`;
        return res.status(httpStatusCode.CONFLICT).json({ message: message });
      }
    }


    return res.status(httpStatusCode.OK).json({ message: constants.MSG_ALL_DONE });
  } catch (error) {
    res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

module.exports = {
  loadShop,
  loadProductInfo,
  loadCart,
  loadCheckout,
  addToCart,
  deleteFromCart,
  addOrder,
  loadOrderSuccess,
  editCart,
  getStock,
  loadWishlist,
  addToWishlist,
  deleteFromWishlist,
  couponApply,
  removeCoupon,
  manageCartStock
};