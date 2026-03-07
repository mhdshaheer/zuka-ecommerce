const logger = require('../helpers/logger');
const User = require("../models/userSchema");
const Cart = require('../models/cartSchema')
const constants = require('../helpers/constants');
const httpStatusCode = require('../helpers/httpStatusCode');


const userAuth = (req,res,next)=>{
    const user = req.session.user || req.session.googleUser;
    if(user){
        User.findById(user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                req.session.destroy()
                res.redirect("/login");
            }
        }).catch(err=>{
            logger.error("Error in user auth middleware", err);
            res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
        })
    }else{
    req.session.destroy()
        res.redirect('/login');
    }
}


const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}
const backToHome = (req,res,next)=>{
    const user = req.session.user || req.session.googleUser;
    if(user){
        res.redirect('/')
    }else{
        next();
    }
}
const orderDone = async (req,res,next)=>{
    try {
        const user = req.session.user || req.session.googleUser;
        const cart = await Cart.findOne({userId:user._id});
        if(!cart || cart.items.length>0){
            res.redirect('/shop')
        }else{
            next();
        }
    } catch (error) {
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send(constants.MSG_SERVER_ERROR);
    }
}

module.exports = {
    userAuth,
    adminAuth,
    backToHome
}