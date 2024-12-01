const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Cart = require('../../models/cartSchema')
const mongoose = require('mongoose')
const Address = require('../../models/addressSchema')
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
       
       
        const newCart = await Cart.findOne({userId:user._id}).populate('items.productId')
        console.log("new Cart: ",cartItem)
        //=====================================================================        
        const total = cartItem.items.reduce((acc,curr)=>{
            return acc+curr.totalPrice;
        },0)
        console.log("total : ",total)

        res.render('shopingCart', {
            activePage: 'cart',
            user,
            cartItem: newCart.items,
            total
        })
    } catch (error) {
        console.log(error)
    }
}

const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user;
        const userAddress = await Address.findOne({userId:user._id});
        const userCart = await Cart.findOne({userId:user._id}).populate('items.productId');
        console.log(userCart)
        // console.log(userAddress)

        res.render('checkout', { 
            activePage: "", 
            user,
            userAddress,
            userCart
         })
    } catch (error) {
        console.log(error);

    }
}

const addToCart = async (req, res) => {
    try {
        const user = req.session.user;
        let { size, stock, productObj, quantity } = req.body
        console.log(size, stock, typeof quantity, productObj._id)
        const sizeFound = await Cart.findOne({userId:user._id,'items.size':size,'items.productId':productObj._id});
        console.log('Product obj: ',productObj)
        console.log('size found : ',sizeFound)
        if(sizeFound){
            const itemIndex = sizeFound.items.findIndex(item => 
                item.size === size && item.productId.toString() === productObj._id.toString()
              );
              console.log('item index is:',itemIndex)
              console.log('stocks : ',sizeFound.items[itemIndex].quantity)
              quantity = Number(quantity) + sizeFound.items[itemIndex].quantity;
              console.log(quantity)
              let totalPrice= Number(quantity) * Number(productObj.regularPrice)
              const result = await Cart.updateOne({userId:user._id},{$set:{[`items.${itemIndex}.quantity`]:quantity}})
              const resultPrice = await Cart.updateOne({userId:user._id},{$set:{[`items.${itemIndex}.totalPrice`]:totalPrice}})
              if (result&&resultPrice) {
                console.log('updated to db')
                res.status(200).json({message:true})
            }

        }else{

        
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
            res.status(200).json({message:true})
        }
    }
    } catch (error) {
        console.log(error);

    }
}
const deleteFromCart = async (req,res)=>{
    try {
        const {index} = req.query;
        console.log('index is :',index)
        const user = req.session.user;
        const cart = await Cart.findOne({userId:user._id},{items:1})
        cart.items.splice(Number(index),1)
        console.log("cart is :",cart.items)

        const result = await Cart.updateOne({userId:user._id},{$set:{items:cart.items}})
        
        if(result){
            res.status(200).json({message:true})
            console.log("successfully deleted")
        }   

    } catch (error) {
        console.log(error)
    }
}

//Orders

const addOrder = async (req,res)=>{
    try {
        const user = req.session.user;
        // const cart = 
    } catch (error) {
        
    }
}

module.exports = {
    loadShop,
    loadProductInfo,
    loadCart,
    loadCheckout,
    addToCart,
    deleteFromCart
}