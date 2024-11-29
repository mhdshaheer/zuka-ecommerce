const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const loadShop = async (req, res) => {

    try {

        const user = req.session.user;
        console.log("home user:", user)
        if (user?.isBlocked == true) {
            return res.redirect('/login')
        }
        // const findUser = await User.findOne({ isAdmin: 0, email: email });
        const products = await Product.find()
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
        const user = req.session.user;
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
        const user = req.session.user;
        const cartItem = await Cart.findOne({ userId: user._id });
        //===========================================================
        const cart = await Cart.aggregate([ {$lookup:{from:'products',localField:'items.productId',foreignField:'_id',as:'result'}},{$project:{result:1}} ])
        // Cart.aggregate([
            // { $match: { userId: user._id } },
            // { $unwind: "$cartItem.items" }, 
            // {
            //     $lookup: {
            //         from: "products",                
            //         localField: "cartItem.items.productId",
            //         foreignField: "_id",              
            //         as: "productDetails"             
            //     }
            // },
            // {
            //     $group: { 
            //         _id: "$_id",
            //         userId: { $first: "$userId" },
            //         cartItem: { $first: "$cartItem" },
            //         productDetails: { $push: { $arrayElemAt: ["$productDetails", 0] } }
            //     }
            // }
        // ])
//=====================================================================        
        console.log('cart after lookup : ',cart[0].result)


        console.log('cart items are :', cartItem)
        res.render('shopingCart', {
            activePage: 'cart',
            user,
            cartItem,
            cart:cart[0].result
        })
    } catch (error) {
        console.log(error)
    }
}

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user;

        res.render('checkout', { activePage: "", user })
    } catch (error) {
        console.log(error);

    }
}

const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        const { size, stock, productObj, quantity } = req.body
        console.log(size, stock, typeof quantity, productObj._id)
        const itemData = {
            productId: productObj._id,
            quantity: Number(quantity),
            price: productObj.regularPrice,
            size,
            totalPrice: Number(quantity) * Number(productObj.regularPrice),

        }
        const toCart = await Cart.findOneAndUpdate(
            { userId: user._id },
            { $push: { items: itemData } },
            { upsert: true, new: true }
        );
        if (toCart) {
            console.log('added to db')
        }
    } catch (error) {
        console.log(error);

    }
}

module.exports = {
    loadShop,
    loadProductInfo,
    loadCart,
    loadCheckout,
    addToCart
}