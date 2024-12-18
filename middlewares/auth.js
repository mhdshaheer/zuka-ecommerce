const User = require("../models/userSchema");


const userAuth = (req,res,next)=>{
    const user = req.session.user || req.session.googleUser
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
        if(data){
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

module.exports = {
    userAuth,
    adminAuth
}