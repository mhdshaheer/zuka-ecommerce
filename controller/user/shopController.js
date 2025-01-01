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
        console.log('Total Pages:', totalPages, 'Current Page:', page);

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
        res.status(500).render('error', { message: 'Internal server error' });
    }
};

const loadProductInfo = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        console.log("home user:", user)
        if (user?.isBlocked == true) {
            return res.redirect('/login')
        }
        const id = req.query.id.trim();
        console.log("id is", id)
        const product = await Product.find({ _id: id })
        const category = await Category.find({ _id: product[0].category })
        const relatedProduct = await Product.find({
            category:product[0].category,
             _id: { $ne: id },
             isBlocked:false
            }).limit(4);
        console.log("related product:",relatedProduct)
        console.log(product, category)
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
        //===========================================================
        console.log("user id is :", user)


        const newCart = await Cart.findOne({ userId: user._id }).populate('items.productId')
        console.log("new Cart: ", cartItem)
        //=====================================================================        
        const total = cartItem?.items.reduce((acc, curr) => {
            return acc + curr.totalPrice;
        }, 0) ?? 0
        console.log("total : ", total);

        const currentDate = new Date(); 
        const coupons = await Coupon.find({ expireOn: { $gte: currentDate } ,userId:{$nin:[user._id]} ,isList:true});
        console.log("coupons:",coupons);

        
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
        console.log(userCart);
        // console.log(userAddress)
        console.log(req.session.discountPrice)

        res.render('checkout', {
            activePage: "",
            user,
            userAddress,
            userCart,
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
        console.log("coupon is :", coupon)
        if (!coupon) {
            req.session.coupon = 0;
            req.session.discountPrice = 0;
            console.log("no coupon")
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

        console.log(couponCode);
        req.session.discountPrice = coupon.discountPrice;
        req.session.minimumPrice = coupon.minimumPrice;
        req.session.couponId = coupon._id;
        req.session.code = coupon.code

        res.status(200).json({ success: true, coupon })
    } catch (error) {
        console.log(error)
    }
}

const removeCoupon = async (req,res)=>{
    try {
        req.session.discountPrice = 0;
        req.session.minimumPrice = 0;
        req.session.couponId = 0;
        req.session.code = null
        res.status(200).json({message:true})
    } catch (error) {
        console.log("Error in coupon remove from the cart",error)
    }
}

const addToCart = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        let { size, stock, productObj, quantity } = req.body
        console.log(size, stock, typeof quantity, productObj._id)
        if (!user) {
            return res.status(404).json({ message: false })
        }

        const sizeFound = await Cart.findOne({ userId: user._id, 'items.size': size, 'items.productId': productObj._id });
        console.log('Product obj: ', productObj)
        console.log('size found : ', sizeFound)

        // For getting varienty id of the perticular varient
        const varientDetail = await Product.findOne({ _id: productObj._id, "variant.size": size }, { 'variant.$': 1 })
        console.log("varient details id:", varientDetail)


        // manage duplicate adding to cart
        if (sizeFound) {
            return res.status(404).json({ itemFound: 1 })
           

        } else {
            let lastPrice = productObj.offerPrice !== 0 ? productObj.offerPrice : productObj.regularPrice //edit

            const itemData = {
                productId: productObj._id,
                varientId: varientDetail.variant[0]._id,
                quantity: Number(quantity),
                // price: productObj.regularPrice,
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
                console.log('added to db')
                res.status(200).json({ message: true })
            }
        }
    } catch (error) {
        console.log(error);

    }
}


const deleteFromCart = async (req, res) => {
    try {
        const { index } = req.query;
        console.log('index is :', index)
        const user = req.session.user || req.session.googleUser;
        const cart = await Cart.findOne({ userId: user._id }, { items: 1 })
        cart.items.splice(Number(index), 1)
        console.log("cart is :", cart.items)

        const result = await Cart.updateOne({ userId: user._id }, { $set: { items: cart.items } })

        if (result) {
            res.status(200).json({ message: true })
            console.log("successfully deleted")
        }

    } catch (error) {
        console.log(error)
    }
}

const getStock = async (req, res) => {
    const { variantId } = req.body
    console.log('variant id:', variantId);
    const product = await Product.findOne({ 'variant._id': variantId }, { 'variant.$': 1 })
    console.log("product is :", product)
    console.log("product is :", product?.variant[0]?.stock)
    const variantStock = product?.variant[0]?.stock;
    return res.status(200).json({ variantStock })
}
//Orders

const addOrder = async (req, res) => {
    try {

        const user = req.session.user || req.session.googleUser;
        const { totalPrice, address, paymentMethod, index } = req.body
        // const cart = await Cart.findOne({ userId: user._id });
        const userWallet = await Wallet.findOne({ userId: user._id })
        console.log("discount amount is:", req.session.discountPrice);
        console.log("total", totalPrice)

        // For blocked product handle:
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId'); 

        if (!cart) {
            console.log("no cart")
            return res.status(400).json({ success: false, message: "Cart not found" });
        }
        const isAnyProductBlocked = cart.items.some(item => item.productId.isBlocked);
        if (isAnyProductBlocked) {
            console.log("Cart have the blocked product")
            return res.status(401).json({
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
            console.log("Successfully added to orders")
            const order = await Order.findOne({ cartId: cart._id })
            console.log("coupon id:", req.session.couponId);
            console.log("coupon id:", user._id);

            const addToCoupon = await Coupon.updateOne(
                { _id: req.session.couponId },
                {
                    $push: { userId: user._id },
                    $inc: { usedCount: 1 }
                }
            )
            console.log('order is :', order)
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

            //Delete cart after order placed
            await Cart.deleteOne({ userId: user._id })


            res.status(200).json({ orderId: order._id })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false })
    }
}

const loadOrderSuccess = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        let orderId = req.query.id
        console.log('order id:', orderId);
        const order = await Order.findOne({ _id: orderId })
        const findAddress = await Address.findOne({ userId: user._id, 'address._id': order.address }, { 'address.$': 1 })
        console.log('address :', findAddress)


        console.log('success: ', order)
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
            console.log("Quantity updated successfully");
            return res.status(200).json({ success: true, totalSum })
        }
    } catch (error) {
        console.log(error);

    }
}

const loadWishlist = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const wishlist = await Wishlist.findOne({ userId: user._id }).populate('products.productId');
        console.log(wishlist)
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
        console.log("product id :", productId);
        const wishlistExist = await Wishlist.findOne({ userId: user._id });
        console.log(wishlistExist)
        if (wishlistExist) {
            console.log("inside exist")
            const isIncluded = wishlistExist.products.some(item =>
                item.productId.equals(new mongoose.Types.ObjectId(productId))
            );

            console.log('is included:', isIncluded)
            if (isIncluded) {
                console.log('inside included');

                return res.status(201).json({ message: "product already exist" })
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

            console.log("Wishlist item push done")
            res.status(200).json({ success: true })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false })
    }
}

const deleteFromWishlist = async (req, res) => {
    try {

        const user = req.session.user || req.session.googleUser;
        const { index } = req.query;
        const wishlist = await Wishlist.findOne({ userId: user._id });
        wishlist.products.splice(index, 1)
        console.log("index is :", index);
        console.log("wishlist is :", wishlist)
        const removeItem = await Wishlist.updateOne({ userId: user._id }, { $set: { products: wishlist.products } })
        if (removeItem) {
            console.log("removed item")
            return res.status(200).json({ success: true })
        }

    } catch (error) {
        console.log(error)
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
    removeCoupon
}