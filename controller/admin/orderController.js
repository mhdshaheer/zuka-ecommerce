const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');

const loadOrderList = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;


        const orders = await Order.find().populate('userId').sort({createdAt:-1}).skip(skip).limit(limit);

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('orderList',{
            orders,
            currentPage: page,
            totalPages,
        })
    } catch (error) {
        res.redirect("/admin/login")
        console.log(error)
    }
}

const orderDetails = async (req,res)=>{
    try {
        const order_id = req.query.order_id
        console.log(order_id);
        const orders = await Order.findOne({_id:order_id}).populate('orderedItems.productId');
        const address = await Address.findOne({userId:orders.userId,'address._id':orders.address},{'address.$':1})
        
        res.render('orderDetails',{
            orders,
            address:address.address[0]
        })
    } catch (error) {
        console.log(error);
        
    }
}

const changeOrderStatus = async (req,res)=>{
    try {
        const order_id = req.query.order_id;
        const {status} =req.body
        const result = await Order.updateOne({_id:order_id},{$set:{status:status}})
        if(result){
            res.status(200).json({success:true})
        }else{
            res.status(400).json({success:false})
        }

    } catch (error) {
        console.log("Error in corderChange",error)
    }
}

module.exports ={
    loadOrderList,
    orderDetails,
    changeOrderStatus
}