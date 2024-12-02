const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema')

const loadOrderList = async (req,res)=>{
    try {
        const orders = await Order.find()
        res.render('orderList',{
            orders
        })
    } catch (error) {
        console.log(error)
    }
}

module.exports ={
    loadOrderList
}