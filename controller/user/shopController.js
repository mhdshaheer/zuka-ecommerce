const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const loadShop =async(req,res)=>{

    try {
        const user = req.session.user;
        console.log("home user:",user)
        if(user?.isBlocked ==true){
            return res.redirect('/login')
        }
        // const findUser = await User.findOne({ isAdmin: 0, email: email });
        const products = await Product.find();
        const category = await Category.find()
        res.render('shop',{
            activePage:'shop',
            products,
            category,user
        })
    } catch (error) {
        console.log("error in shop page",error)
    }
}
const loadProductInfo = async (req,res)=>{
    try {
        const user = req.session.user;
        console.log("home user:",user)
        if(user?.isBlocked ==true){
            return res.redirect('/login')
        }
        const id=req.query.id;
        console.log("id is",id)
        const product = await Product.find({_id:id})
        const category = await Category.find({_id:product[0].category})
        console.log(product,category)
        res.render('productDetail',{
            product,
            category,
            activePage:'',
            user
        })
    } catch (error) {
        console.log("error in product info page load",error)
    }
}

const loadCart = async (req,res)=>{
    try {
        res.render('shopingCart',{activePage:'cart'})
    } catch (error) {
        
    }
}

const loadCheckout = async (req,res)=>{
    try {
        res.render('checkout',{activePage:""})
    } catch (error) {
        
    }
}

module.exports = {
    loadShop,
    loadProductInfo,
    loadCart,
    loadCheckout
}