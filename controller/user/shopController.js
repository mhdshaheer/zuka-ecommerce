const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const loadShop =async(req,res)=>{
    try {
        const products = await Product.find();
        const category = await Category.find()
        res.render('shop',{
            activePage:'shop',
            products,
            category
        })
    } catch (error) {
        
    }
}
const loadProductInfo = async (req,res)=>{
    try {
        const id=req.query.id;
        console.log("id is",id)
        const product = await Product.find({_id:id})
        const category = await Category.find({_id:product[0].category})
        console.log(product,category)
        res.render('productDetail',{
            product,
            category
        })
    } catch (error) {
        
    }
}

// const productInfo = async (req,res)=>{
//     try {
//         const id = req.params
//     } catch (error) {
        
//     }
// }
module.exports = {
    loadShop,
    loadProductInfo,
    // productInfo
}