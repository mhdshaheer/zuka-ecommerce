const express = require('express')
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { truncateSync } = require('fs-extra');
const env = require("dotenv").config()

//===================================================

//================sign up ===========================

const loadSignup = async (req, res) => {
    try {
        res.render('signup',{message:""})
    } catch (error) {
        console.log('sign up page not found');
        res.status(500).send('Server error')
    }
}

const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        if (password != confirmPassword) {
            return res.render("signup", { message: "passwords do not match" });

        }

        const finduser = await User.findOne({ email });
        if (finduser) {
            return res.render("signup", { message: "User with this email already exist" })
        }
        const otp = generateOtp()

        const emailSent = await sendEmailVerify(email, otp);
        if (!emailSent) {
            return res.json("email error");
        }
        req.session.userOtp = otp;
        req.session.userData = { name, email, password };
        console.log(req.session.userData);

        res.render("verify-otp");
        console.log("otp sent", otp);

    } catch (error) {
        console.error("signup error", error);
        res.redirect('/pageNotFound');
    }
}



//=================== login ============================

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            res.render('login', { message: '' })
        } else {
            res.redirect('/');
        }

    } catch (error) {
        console.log('Login page not found');
        res.redirect('/page_404')
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("login post", email, password)
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        console.log(findUser)

        if (!findUser) {
            console.log('not found')
            return res.render('login', { message: "User not found" });
        } else if (findUser.isBlocked) {
            console.log('blocked...')
            return res.render('login', { message: "User is blocked by admin" })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            console.log('not match pass....')
            return res.render('login', { message: "Incorrect password" });
        }

        // req.session.user = findUser._id;
        req.session.user = findUser;
        console.log('time to redirect')
        res.redirect('/');



    } catch (error) {
        console.log("Login error");
        res.render('login', { message: "Login failed , Please try again later" })
    }
}
//===================== logout ============================

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destroy error", err.message);
                return res.redirect('/pageNotFound')
            }
            console.log("session destroyed")
            res.redirect('/')
        });

    } catch (error) {
        console.log("Logout error...",error);
        return res.redirect('/pageNotFound');
    }
}

//===================== otp ============================

function generateOtp() {
    return Math.floor(100000 + Math.random() * 90000).toString();
}

//================= sent & resent otp ================================

const resentOtp = async (req, res) => {
    try {

        const { email } = req?.session?.userData;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }

        let otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sendEmailVerify(email, otp);
        console.log(emailSent);

        if (emailSent) {
            console.log("Resent otp", otp);
            res.status(200).json({ success: true, message: "otp resent successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resent otp,Please try again" })
        }

    } catch (error) {
        console.error("error resenting otp");
        res.status(500).json({ success: false, message: "Internal server error,please try again" })
    }
}

async function sendEmailVerify(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        // Send the email
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "otp test",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,

        });



        return info.accepted.length > 0


    } catch (error) {
        console.log("Error Sending mail", error);
        return false;
    }
}

//==================bcrypt password =====================

const securePassword = async (password) => {
    try {
        const passHash = await bcrypt.hash(password, 10);
        return passHash;
    } catch (error) {

    }
}

//==================== verify otp ========================

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("otp is:", otp);
        if (otp == req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash
            });
            await saveUserData.save();

            console.log("Added to database...")

            req.session.user = saveUserData;

            res.json({ success: true, redirectUrl: "/" });
           
            console.log("redirected to home ")
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP , Please try again" })
        }
    } catch (error) {
        console.error("Error verifying OTP ", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
}

//================== home page ========================

const loadHomePage = async (req, res) => {
    try {
        const googleUser = req.user;
        req.session.googleUser=googleUser;
        const user = req.session.user;
        console.log("home user:",user)
        if(user?.isBlocked ==true){
            return res.redirect('/login')
        }
        if (user) {
            const userData = await User.findOne({ _id: user._id });
            console.log(userData)
            console.log("userData is :",userData?.name)
            console.log("hai home")
            res.render('home', { user: userData,activePage:'home'});
        } else if(googleUser){
            console.log("google user:",googleUser)
            res.render('home', { user: googleUser,activePage:'home'});
        }else {
            console.log("hai home iiii")
            console.log("userData is :",user)
            return res.render('home',{user,activePage:'home'})
        }

    } catch (error) {
        console.log('Home page not found!',error);
        res.status(500).send('Server error')
    }

}
//=============== page not found ======================


const pageNotFound = async (req, res) => {
    try {
        res.render('page_404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//================= end =============================



// profile page
const loadProfile = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('profile',{
            user,
            activePage:''
        })
    } catch (error) {
        
    }
}
const loadAddress = async (req,res)=>{
    try {
        const user = req.session.user
        const addressDb = await Address.findOne({userId:user?._id})
        
        return res.render('addAddress',{
           user,
           addressDb,
           activePage:""
       })

    } catch (error) {
        console.log("error in load address",error)
    }
}
const editName = async (req,res)=>{
    try {
        const user = req.session.user;
        const {userName} = req.body
        const result = await User.updateOne({_id:user._id},{$set:{name:userName}})
        req.session.user.name = userName
        res.status(200).json({success:"profile name successfully edited"})
        res.redirect('/profile')
    } catch (error) {
        
    }
}
const loadPassChange = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('passChange',{activePage:'',user});
    } catch (error) {
        
    }
}
const changePass = async(req,res)=>{
    try {
        const {oldPassword,newPassword} = req.body;
        const user = req.session.user
        const userPass = req.session.user.password;
        console.log(oldPassword,newPassword)
        console.log(userPass)
        console.log(oldPassword,newPassword);
        const compPass = await bcrypt.compare(oldPassword,userPass)
        if(!compPass){
            return res.status(401).json({message:"Password not match"})
        }
        const changePass = await securePassword(newPassword);
        await User.updateOne({_id:user._id},{$set:{password:changePass}})
        console.log("Password change succesfully")
        console.log(compPass) 
        return res.status(200).json({message:"success"})
    } catch (error) {
        console.log("server error",error);
        res.redirect('/pageNotFound')
    }
}
const loadForgotPass = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('forgotPassword',{
            user,
            activePage:""
        })
    } catch (error) {
        
    }
}

const sentOtp = async (req,res)=>{
    try {
        const {email}= req.body;
        req.session.email= email;
        const emailFound = await User.find({email:email})
        req.session.user = emailFound
        if(emailFound){
            console.log("match");
            const otp = generateOtp();
            req.session.forgotOtp = otp;
            const sentOtp = await sendEmailVerify(email,otp);
            if(sentOtp){
                console.log("otp sent:",otp)
                res.status(200).json({message:"success"});

            }

        }else{
            res.status(401).json({message:"Email not match"});
        }
        console.log(email)
    } catch (error) {
        
    }
}
const loadForgotOtpVerify = async (req,res)=>{
    try {
        res.render('forgotOtpVerify')
    } catch (error) {
        
    }
}

const verifyForgot = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("otp is:", otp);
        if (otp == req.session.forgotOtp) {
            console.log("OTP verified successfully")
            return res.status(200).json({success:true})
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP , Please try again" })
        }
    } catch (error) {
        console.error("Error verifying OTP ", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
}

const resentForgotOtp = async (req, res) => {
    try {

        let otp = generateOtp();
        req.session.forgotOtp = otp;
        const email = req.session.user.email
        const emailSent = await sendEmailVerify(email, otp);
        console.log(emailSent);

        if (emailSent) {
            console.log("Resent otp", otp);
            res.status(200).json({ success: true, message: "otp resent successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resent otp,Please try again" })
        }

    } catch (error) {
        console.error("error resenting otp",error);
        res.status(500).json({ success: false, message: "Internal server error,please try again" })
    }
}

const newPassSet = async (req,res)=>{
    try {
        const user = req.session.user
        res.render('newPassword',{activePage :"",user})
    } catch (error) {
        
    }
}
const updatePass = async (req,res)=>{
    try {
        const {password} = req.body;
        const email = req.session.email;
        const bcryptPass = await securePassword(password);
        const result = await User.updateOne({email:email},{$set:{password:bcryptPass}})
        if(result){
            // req.session.user.password=bcryptPass;
            req.session.destroy()
            res.status(200).json({message:"Password changed successfully"});
            console.log("password changed successfully")
        }else{
            res.status(400).json({message:"Password change error"})
            console.log("password change not done..! Error")
        }

    } catch (error) {
        console.log("server error in password changing",error)
        res.status(500).json({message:"Server while changing password"})
    }
}

const addAddress = async (req,res)=>{
    try {
        const address=req.body;
        console.log(address)
        const addressData = {
            addressType:address.addressType,
            name:address.name,
            country:address.country,
            city:address.city,
            address:address.address,
            state:address.state,
            pincode:address.pincode,
            phone:address.phone,
            altPhone:address.altPhone
        }
        const user  = req.session.user;
        console.log("session data:",user);
        // const userId = await User.findOne({_id:user._id},{_id:1})
        // console.log("user id from the session:",userId)
        const updateAddress = await Address.findOneAndUpdate(
            {userId:user._id},
            {$push:{address:addressData}},
            {upsert:true,new:true}
        );
        if(updateAddress){
            console.log("address added")
            res.status(200).json({success:true})
        }else{
            console.log("error in address adding")
            res.status(400).json({success:false})
        }
        // await address.save()
    } catch (error) {
        console.log("error in adding address",error)
        res.status(500).json({success:false})
    }
}

//delete address
const deleteAddress = async(req,res)=>{
    try {
        const {index} = req.query;
        const user = req.session.user
        console.log("index is : ",index)
        const addressData = await Address.findOne({userId:user._id});
        const addressArr = addressData.address
        addressArr.splice(index,1);
        console.log(addressArr);
        await Address.updateOne({userId:user._id},{$set:{address:addressArr}})
        res.status(200).json({success:true})
        console.log("Address deleted successfully")
        

        
    } catch (error) {
        console.log(error)
    }
}

const cropImage = async(req,res)=>{
    try {

        res.render('justForCrop');
    } catch (error) {
        
    }
}

module.exports = {
    loadSignup,
    loadLogin,
    loadHomePage,
    pageNotFound,
    verifyOtp,
    resentOtp,
    login,
    logout,
    signup,
    loadProfile,
    loadAddress,
    editName,
    
    //password change
    loadPassChange,
    changePass,

    //forgot password
    loadForgotPass,
    sentOtp,
    loadForgotOtpVerify,
    verifyForgot,
    resentForgotOtp,
    newPassSet,
    updatePass,

    //address
    addAddress,
    deleteAddress,

    cropImage
}