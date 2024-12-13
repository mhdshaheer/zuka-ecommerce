const express = require('express')
const User = require('../../models/userSchema');
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");



const loadLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        console.log("before render of admin login")

        res.render('admin-login',{message:"Incorrect username or password"})
        console.log("after render of admin login")
    } catch (error) {
        console.log("admin render error")
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("admin login : ", email, password)
        const admin = await User.findOne({ email, isAdmin: true });
        console.log("admin login 1 : ", admin)
        if (admin) {
            console.log("admin passcheck...")
            const passwordMatch = await bcrypt.compare(password, admin.password);
            console.log(passwordMatch)
            if (passwordMatch) {
                req.session.admin = true;
                // return res.redirect('/admin/dashboard')
                return res.status(200).json({message:""})

            } else {
                // return res.redirect('/admin/login')
                return res.status(200).json({message:"Incorrect password"})
            }
        } else {
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log("error in admin login")
        res.redirect('/admin/adminError')
    }
}

const loadDashboard = async (req, res) => {
    if (req.session.admin) {

        try {
            res.render('dashboard')
            console.log("into dashboard")
        } catch (error) {
            console.log("dashboard error...")
        }
    }else{
        res.redirect('/admin/login')
    }
}


const adminErrorLoad = async (req,res)=>{
    try {
        res.render('admin-error');
    } catch (error) {
        console.log("Eroor in adminError page")
    }
}

const logout = async (req,res)=>{
    try {
        req.session.destroy(err => {
            if(err){
                console.log("Error in admin session destrying...",err);
                res.redirect('/admin/adminError');
            }
            res.redirect('/admin/login')
        });
    } catch (error) {
        console.log("Error in logout admin...")
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    adminErrorLoad,
    logout,
}