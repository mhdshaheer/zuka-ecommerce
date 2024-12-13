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
        console.log("home user:", user)
        if (user?.isBlocked == true) {
            return res.redirect('/login')
        }
        // const findUser = await User.findOne({ isAdmin: 0, email: email });
        const products = await Product.find({ isBlocked: false }).populate('category')
        console.log(products)
        const category = await Category.find()
        res.render('shop', {
            activePage: 'shop',
            products,
            category,
            user
        })
    } catch (error) {
        console.log("error in shop page", error)
    }
}
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
        console.log(product, category)
        res.render('productDetail', {
            product,
            category,
            activePage: '',
            user
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

        res.render('shopingCart', {
            activePage: 'cart',
            user,
            cartItem: newCart?.items,
            total,
            cart: newCart
        })
    } catch (error) {
        console.log(error)
    }
}

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const {discountAmount,totalAfterAll} = req.query;
        console.log("discount:",discountAmount,totalAfterAll)
        const userAddress = await Address.findOne({ userId: user._id });
        const userCart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        const wallet = await Wallet.findOne({userId:user._id});
        console.log(userCart);
        // console.log(userAddress)
        console.log(req.session.discountPrice)

        res.render('checkout', {
            activePage: "",
            user,
            userAddress,
            userCart,
            wallet,
            totalAfterAll,
            couponDiscount:req.session.discountPrice || 0,
            couponMin : req.session.minimumPrice || 0
        })
    } catch (error) {
        console.log(error);

    }
}

const couponApply = async (req,res)=>{
    try {
        const {couponCode} = req.body;
        const user = req.session.user|| req.session.googleUser
        const coupon = await Coupon.findOne({code:couponCode});
        const userCoupon = await Coupon.findOne({code:couponCode,userId: { $elemMatch: { $eq: user._id } }})
        console.log("coupon is :",coupon)
        if(!coupon){
            req.session.coupon = 0;
            console.log("no coupon")
            return res.status(402).json({message:"Coupon is invalid!"})
        }
        if(userCoupon){
            req.session.coupon = 0;
            return res.status(402).json({message:"Coupon is already used!"})
        }

        console.log(couponCode);
        req.session.discountPrice = coupon.discountPrice;
        req.session.minimumPrice = coupon.minimumPrice;
        req.session.couponId = coupon._id;

        res.status(200).json({success:true,coupon})
    } catch (error) {
        console.log(error)
    }
}

const addToCart = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        let { size, stock, productObj, quantity } = req.body
        console.log(size, stock, typeof quantity, productObj._id)

        const sizeFound = await Cart.findOne({ userId: user._id, 'items.size': size, 'items.productId': productObj._id });
        console.log('Product obj: ', productObj)
        console.log('size found : ', sizeFound)

        // For getting varienty id of the perticular varient
        const varientDetail = await Product.findOne({ _id: productObj._id, "variant.size": size }, { 'variant.$': 1 })
        console.log("varient details id:", varientDetail)


        // manage duplicate adding to cart
        if (sizeFound) {
            const itemIndex = sizeFound.items.findIndex(item =>
                item.size === size && item.productId.toString() === productObj._id.toString()
            );
            console.log('item index is:', itemIndex)
            console.log('stocks : ', sizeFound.items[itemIndex].quantity)
            quantity = Number(quantity) + sizeFound.items[itemIndex].quantity;
            console.log(quantity)
            let totalPrice = Number(quantity) * Number(productObj.offerPrice!==0?productObj.offerPrice:productObj.regularPrice) //edit
            const result = await Cart.updateOne({ userId: user._id }, { $set: { [`items.${itemIndex}.quantity`]: quantity } })
            const resultPrice = await Cart.updateOne({ userId: user._id }, { $set: { [`items.${itemIndex}.totalPrice`]: totalPrice } })
            if (result && resultPrice) {
                console.log('updated to db')
                res.status(200).json({ message: true })
            }

        } else {
            let lastPrice = productObj.offerPrice!==0?productObj.offerPrice:productObj.regularPrice //edit

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

//Orders

const addOrder = async (req, res) => {
    try {

        const user = req.session.user || req.session.googleUser;
        const { totalPrice, address, paymentMethod, index } = req.body
        const cart = await Cart.findOne({ userId: user._id });
        const userWallet = await Wallet.findOne({userId:user._id})

        // Insufficient balance 
        if(paymentMethod=='Wallet'){
            if(userWallet.balance<totalPrice){
                return res.status(402).json({message:"Insufficient balance to process the transaction."})
            }
        }

        const addOrder = await Order.create({
            cartId: cart._id,
            userId: user._id,
            orderedItems: cart.items,
            totalPrice,
            finalAmount: totalPrice-req.session.discountPrice,
            address: address._id,
            index: Number(index),
            paymentMethod,
            couponDiscount:req.session.discountPrice || 0,
            couponApplied:req.session.discountPrice?true:false

        });
        if (addOrder) {
            console.log("Successfully added to orders")
            const order = await Order.findOne({ cartId: cart._id })
            console.log("coupon id:",req.session.couponId);
            console.log("coupon id:",req.session.user._id);

            const addToCoupon = await Coupon.updateOne(
                {_id:req.session.couponId},
                {
                    $push:{userId:req.session.user._id},
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
            if(paymentMethod=='Wallet'){
                let transactions={
                    type:'Debit',
                    amount:order.finalAmount,
    
                }
                await Wallet.findOneAndUpdate(
                    {userId:user._id},
                    {
                        $inc: { balance: -order.finalAmount },
                        $push:{
                        transactions:transactions
                    }},
                    {upsert:true,new:true}
                );
                await Order.updateOne({cartId: cart._id},{$set:{paymentStatus:"Paid"}})
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
        const userCart = await Cart.findOne({_id:cartId})
        const totalSum = userCart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        if (result.matchedCount === 0) {
            console.error("No cart found with the specified ID");
        } else if (result.modifiedCount === 0) {
            console.warn("Quantity was not modified (maybe it was already the same)");
        } else {
            console.log("Quantity updated successfully");
            return res.status(200).json({success:true,totalSum})
        }
    } catch (error) {
        console.log(error);

    }
}

const loadWishlist = async (req, res) => {
    try {
        const user = req.session.user || req.session.googleUser;
        const wishlist = await Wishlist.findOne({userId:user._id}).populate('products.productId');
        console.log(wishlist)
        res.render('wishlist', {
            activePage: '',
            wishProducts:wishlist.products,
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
        const wishlistExist = await Wishlist.findOne({userId:user._id});
        console.log(wishlistExist)
        if(wishlistExist){
            console.log("inside exist")
            const isIncluded = wishlistExist.products.some(item => 
                item.productId.equals(new mongoose.Types.ObjectId(productId))
              );
              
              console.log('is included:',isIncluded)
            if(isIncluded){
                console.log('inside included');
                
                return res.status(201).json({message:"product already exist"})
            }
        }
        const addWishlist = await Wishlist.findOneAndUpdate(
            { userId: user._id},
            {
                $push: {
                    products: { 
                        productId:productId,
                        addedOn: new Date()
                    }
                }
            },
            { new: true,upsert: true }
        )
        if (addWishlist) {

            console.log("Wishlist item push done")
            res.status(200).json({success:true})
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({success:false})
    }
}

const deleteFromWishlist = async (req,res)=>{
    try {

        const user = req.session.user||req.session.googleUser;
        const {index} = req.query;
        const wishlist = await Wishlist.findOne({userId:user._id});
        wishlist.products.splice(index,1)
        console.log("index is :",index);
        console.log("wishlist is :",wishlist)
        const removeItem = await Wishlist.updateOne({userId:user._id},{$set:{products:wishlist.products}})
        if(removeItem){
            console.log("removed item")
            return res.status(200).json({success:true})        }

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
    loadWishlist,
    addToWishlist,
    deleteFromWishlist,
    couponApply
}