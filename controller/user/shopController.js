const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const Wishlist = require('../../models/wishlistSchema')
const Wallet = require('../../models/walletSchema')
const Coupon = require('../../models/couponSchema')
const mongoose = require('mongoose')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema');
const httpStatusCode = require('../../helpers/httpStatusCode')
const HttpStatusCode = require('../../helpers/httpStatusCode')

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

        // Build query
        let query = { isBlocked: false };
        
        // Search functionality
        if (search) {
            query.productName = { $regex: new RegExp(search, 'i') };
        }

        // Category filter
        if (categoryId) {
            query.category = categoryId;
        }

        // Build sort options
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
                sortOptions = { createdAt: -1 }; // Default sort
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute queries
        const [products, totalProducts, category] = await Promise.all([
            Product.find(query)
                .populate('category')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit),
            Product.countDocuments({isBlocked:false}),
            Category.find()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

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
        console.log("error in shop page", error);
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).render('error', { message: 'Internal server error' });
    }
};

const loadProductInfo = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        if (user?.isBlocked == true) {
            return res.redirect('/login')
        }
        const productId = req.query.id.trim();
        const product = await Product.find({ _id: productId })
        const category = await Category.find({ _id: product[0].category })
        const relatedProduct = await Product.find({
            category:product[0].category,
             _id: { $ne: productId },
             isBlocked:false
            }).limit(4);
        res.render('productDetail', {
            product,
            category,
            activePage: '',
            user,
            relatedProduct
        })
    } catch (error) {
        console.log("error in product info page load", error)
    }
}

const loadCart = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const cartItem = await Cart.findOne({ userId: user._id });
        const newCart = await Cart.findOne({ userId: user._id }).populate('items.productId')
        //=====================================================================        
        const total = cartItem?.items.reduce((acc, curr) => {
            return acc + curr.totalPrice;
        }, 0) ?? 0

        const currentDate = new Date(); 
        const coupons = await Coupon.find({ expireOn: { $gte: currentDate } ,userId:{$nin:[user._id]} ,isList:true});

        
        res.render('shopingCart', {
            activePage: 'cart',
            user,
            cartItem: newCart?.items,
            total,
            cart: newCart,
            coupons,
            isCouponApplied : req.session.discountPrice || 0,
            couponMin : req.session.minimumPrice || 0,
            couponCode:req.session.code 
        })
    } catch (error) {
        console.log(error)
    }
}

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const userAddress = await Address.findOne({ userId: user._id });
        const userCart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        const wallet = await Wallet.findOne({ userId: user._id });

        res.render('checkout', {
            activePage: "",
            user,
            userAddress,
            userCart:userCart||[],
            wallet,
            couponDiscount: req.session.discountPrice || 0,
            couponMin: req.session.minimumPrice || 0
        })
    } catch (error) {
        console.log(error);

    }
}

const couponApply = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const user = req.session.user || req.session.googleUser;
        const currentDate = new Date();
        const coupon = await Coupon.findOne({ code: couponCode });
        const userCoupon = await Coupon.findOne({ code: couponCode, userId: { $elemMatch: { $eq: user._id } } })
        if (!coupon) {
            req.session.coupon = 0;
            req.session.discountPrice = 0;
            return res.status(402).json({ message: "Coupon is invalid!" })
        }
        if (currentDate > coupon.expireOn) {
            return res.status(402).json({ message: "Coupon is Expired!" })
        }
        if (userCoupon) {
            req.session.coupon = 0;
            req.session.discountPrice = 0;
            return res.status(402).json({ message: "Coupon is already used!" })
        }

        req.session.discountPrice = coupon.discountPrice;
        req.session.minimumPrice = coupon.minimumPrice;
        req.session.couponId = coupon._id;
        req.session.code = coupon.code

        res.status(httpStatusCode.OK).json({ success: true, coupon })
    } catch (error) {
        console.log(error)
    }
}

const removeCoupon = async (req,res)=>{
    try {
        req.session.discountPrice = 0;
        req.session.minimumPrice = 0;
        req.session.couponId = null;
        req.session.code = null
        res.status(httpStatusCode.OK).json({message:true})
    } catch (error) {
        console.log("Error in coupon remove from the cart",error)
    }
}

const addToCart = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        let { size, stock, productObj, quantity } = req.body
        if (!user) {
            return res.status(httpStatusCode.NOT_FOUND).json({ message: false })
        }

        const sizeFound = await Cart.findOne({ userId: user._id, 'items.size': size, 'items.productId': productObj._id });

        // For getting varienty id of the perticular varient
        const varientDetail = await Product.findOne({ _id: productObj._id, "variant.size": size }, { 'variant.$': 1 })


        // manage duplicate adding to cart
        if (sizeFound) {
            return res.status(httpStatusCode.NOT_FOUND).json({ itemFound: 1 })
           

        } else {
            let lastPrice = productObj.offerPrice !== 0 ? productObj.offerPrice : productObj.regularPrice //edit

            const itemData = {
                productId: productObj._id,
                varientId: varientDetail.variant[0]._id,
                quantity: Number(quantity),
                price: lastPrice,
                size,
                totalPrice: Number(quantity) * Number(lastPrice),

            }
            const toCart = await Cart.findOneAndUpdate(
                { userId: user._id },
                { $push: { items: itemData } },
                { upsert: true, new: true }
            );
            if (toCart) {
                res.status(httpStatusCode.OK).json({ message: true })
            }
        }
    } catch (error) {
        console.log(error);

    }
}


const deleteFromCart = async (req, res) => {
    try {
        const { index } = req.query;
        const user = req.session.user || req.session.googleUser;
        const cart = await Cart.findOne({ userId: user._id }, { items: 1 })
        cart.items.splice(Number(index), 1)

        const result = await Cart.updateOne({ userId: user._id }, { $set: { items: cart.items } })
        const cartItems = await Cart.find({userId: user._id})

        if (result) {
            res.status(httpStatusCode.OK).json({ message: true,cartItems })
        }

    } catch (error) {
        console.log(error)
    }
}

const getStock = async (req, res) => {
    const { variantId } = req.body
    const product = await Product.findOne({ 'variant._id': variantId }, { 'variant.$': 1 })
    const variantStock = product?.variant[0]?.stock;
    return res.status(httpStatusCode.OK).json({ variantStock })
}
//Orders

const addOrder = async (req, res) => {
    try {

        const user = req.session.user || req.session.googleUser;
        const { totalPrice, address, paymentMethod, index } = req.body
        const userWallet = await Wallet.findOne({ userId: user._id })

        // For blocked product handle:
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId'); 

        if (!cart) {
            return res.status(httpStatusCode.BAD_REQUEST).json({ success: false, message: "Cart not found" });
        }
        const isAnyProductBlocked = cart.items.some(item => item.productId.isBlocked);
        if (isAnyProductBlocked) {
            return res.status(httpStatusCode.UNAUTHORIZED).json({
                message: "Your cart contains blocked products. Please remove them to proceed."
            });
        }

        // Insufficient balance 
        if (paymentMethod == 'Wallet') {
            if (userWallet.balance < totalPrice) {
                return res.status(402).json({ message: "Insufficient balance to process the transaction." })
            }
        }


        const addOrder = await Order.create({
            cartId: cart._id,
            userId: user._id,
            orderedItems: cart.items,
            totalPrice,
            finalAmount: totalPrice - (req.session.discountPrice ?? 0),
            address: address._id,
            index: Number(index),
            paymentMethod,
            couponDiscount: req.session.discountPrice || 0,
            couponApplied: req.session.discountPrice ? true : false

        });
        if (addOrder) {
            const order = await Order.findOne({ cartId: cart._id })
            if(req.session.couponId ){

                const addToCoupon = await Coupon.updateOne(
                    { _id: req.session.couponId },
                    {
                        $push: { userId: user._id },
                        $inc: { usedCount: 1 }
                    }
                )
            }
            req.session.order = order

            // Reduce stocks
            cart.items.map(async (item) => {
                await Product.updateOne({ [`variant._id`]: item.varientId }, { $inc: { 'variant.$.stock': -item.quantity } })
            });

            //====== Debit amount from Wallet ===============
            if (paymentMethod == 'Wallet') {
                let transactions = {
                    type: 'Debit',
                    amount: order.finalAmount,

                }
                await Wallet.findOneAndUpdate(
                    { userId: user._id },
                    {
                        $inc: { balance: -order.finalAmount },
                        $push: {
                            transactions: transactions
                        }
                    },
                    { upsert: true, new: true }
                );
                await Order.updateOne({ cartId: cart._id }, { $set: { paymentStatus: "Paid" } })
            }
            //==================================

            await Cart.deleteOne({ userId: user._id })


            res.status(httpStatusCode.OK).json({ orderId: order._id })
        }
    } catch (error) {
        console.log(error)
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false })
    }
}

const loadOrderSuccess = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        let orderId = req.query.id
        const order = await Order.findOne({ _id: orderId })
        const findAddress = await Address.findOne({ userId: user._id, 'address._id': order.address }, { 'address.$': 1 })


        res.render('orderSuccess', {
            activePage: '',
            user,
            order,
            address: findAddress.address[0]
        })
    } catch (error) {
        console.log(error)
    }
}

const editCart = async (req, res) => {
    try {
        const { itemIndex, itemId, cartId, quantity, regularPrice } = req.body;
        console.log(itemIndex, itemId, cartId, quantity, regularPrice)
        let total = Number(quantity) * Number(regularPrice)
        const result = await Cart.updateOne({ _id: cartId, 'items._id': itemId }, {
            $set: {
                [`items.${itemIndex}.quantity`]: Number(quantity),
                [`items.${itemIndex}.totalPrice`]: total
            }
        });
        const userCart = await Cart.findOne({ _id: cartId })
        const totalSum = userCart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        if (result.matchedCount === 0) {
            console.error("No cart found with the specified ID");
        } else if (result.modifiedCount === 0) {
            console.warn("Quantity was not modified (maybe it was already the same)");
        } else {
            return res.status(httpStatusCode.OK).json({ success: true, totalSum })
        }
    } catch (error) {
        console.log(error);

    }
}

const loadWishlist = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const wishlist = await Wishlist.findOne({ userId: user._id }).populate('products.productId');
        res.render('wishlist', {
            activePage: '',
            wishProducts: wishlist.products,
            user
        })
    } catch (error) {
        console.log(error)
    }
}

const addToWishlist = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        console.log(user)
        const { productId } = req.body;
        const wishlistExist = await Wishlist.findOne({ userId: user._id });
        console.log(wishlistExist)
        if (wishlistExist) {
            const isIncluded = wishlistExist.products.some(item =>
                item.productId.equals(new mongoose.Types.ObjectId(productId))
            );

            if (isIncluded) {
                return res.status(httpStatusCode.CREATED).json({ message: "product already exist" })
            }
        }
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
        )
        if (addWishlist) {
            res.status(httpStatusCode.OK).json({ success: true })
        }
    } catch (error) {
        console.log(error)
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false })
    }
}

const deleteFromWishlist = async (req, res) => {
    try {

        const user = req.session.user || req.session.googleUser;
        const { index } = req.query;
        const wishlist = await Wishlist.findOne({ userId: user._id });
        wishlist.products.splice(index, 1)
        const removeItem = await Wishlist.updateOne({ userId: user._id }, { $set: { products: wishlist.products } })
        if (removeItem) {
            return res.status(httpStatusCode.OK).json({ success: true })
        }

    } catch (error) {
        console.log(error)
    }
}

const manageCartStock = async (req,res) => {
    try {
        const {userId} = req.body;
        console.log("user id:",userId)
        const userCart = await Cart.findOne({userId:userId},{items:1}).populate('items.productId')
        console.log("user cart:",userCart.items);
        for (const item of userCart.items) {
            console.log("size:", item.size, "quantity:", item.quantity);
            const stockCheck = await Product.findOne({ _id:item.productId,'variant.size': item.size, 'variant.stock': { $lt: item.quantity } },{'variant.$':1});
            console.log('stock check:', stockCheck);
        
            if (stockCheck) {
                console.log('Stock issue found for size:', item.size);
                let message=`Product ${item.productId.productName} with size '${item.size}' has only ${stockCheck.variant[0].stock} stocks left.`
                return res.status(409).json({ message: message});
            }
        }
        
        
        return res.status(200).json({message:'All done'})
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({success:false});
    }
}

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
}