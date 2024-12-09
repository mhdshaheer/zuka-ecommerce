const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');

const loadOrderList = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;


        const orders = await Order.find().populate('userId').sort({createdAt:-1}).skip(skip).limit(limit);
        console.log('Orders admin :',orders)

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('orderList',{
            orders,
            currentPage: page,
            totalPages,
        })
    } catch (error) {
        console.log(error)
    }
}

const orderDetails = async (req,res)=>{
    try {
        const order_id = req.query.order_id
        console.log(order_id);
        const orders = await Order.findOne({_id:order_id}).populate('orderedItems.productId');
        console.log("Orders are :",orders)
        const address = await Address.findOne({userId:orders.userId,'address._id':orders.address},{'address.$':1})
        
        console.log("Ordered items  are :",orders.orderedItems)
        console.log('===============================');
        console.log("Address is :",address)
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
        console.log("order id:",order_id,status)
        const result = await Order.updateOne({_id:order_id},{$set:{status:status}})
        if(result){
            console.log("update status done!")
            res.status(200).json({success:true})
        }else{
            console.log("update status failed!")
            res.status(400).json({success:false})
        }

    } catch (error) {
        
    }
}

module.exports ={
    loadOrderList,
    orderDetails,
    changeOrderStatus
}