const User = require("../models/userSchema");
const Cart = require('../models/cartSchema')


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
            console.log("Error in user auth middleware");
            res.status(500).send("Internal Server Error");
        })
    }else{
    req.session.destroy()
        res.redirect('/login');
    }
}


const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data && req.session.admin){
            next();
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(err=>{
        console.log("Error in adminAuth middleware",err);
        res.status(500).send("Internal Server Error");
        
    })

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
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    userAuth,
    adminAuth,
    backToHome
}