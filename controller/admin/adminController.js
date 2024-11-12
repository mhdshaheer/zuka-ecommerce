const express = require('express')
const User = require('../../models/userSchema');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");



const loadLogin = async (req,res)=>{
    try {
        if(req.session.admin){
            return res.redirect('/admin/dashboard');
        }
        console.log("before render of admin login")
        res.render('admin-login')
        console.log("after render of admin login")
    } catch (error) {
        console.log("admin render error")
    }
}

const login = async (req,res)=>{
    try {
        const {email,password} = req.body;
        const admin = await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch = bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin = true ;
                return res.redirect('/admin')
            }else{
                return res.redirect('/login')
            }
        }else{
            return res.redirect('/login')
        }
    } catch (error) {
        
    }
}



module.exports = {
    loadLogin,
    login
}