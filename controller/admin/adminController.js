const express = require('express')
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema');
const Category = require('../../models/categorySchema')
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");



const loadLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        console.log("before render of admin login")

        res.render('admin-login', { message: "Incorrect username or password" })
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
                return res.status(200).json({ message: "" })

            } else {
                // return res.redirect('/admin/login')
                return res.status(200).json({ message: "Incorrect password" })
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
            const filterBy = req.query.filterBy || "weekly";
            const dataType = req.query.dataType || "products";

            const startDate = new Date();
            if (filterBy === "weekly") {
                startDate.setDate(startDate.getDate() - 7);
            } else if (filterBy === "monthly") {
                startDate.setMonth(startDate.getMonth() - 1);
            } else if (filterBy === "yearly") {
                startDate.setFullYear(startDate.getFullYear() - 1);
            }

            // Delivered Orders
            const deliveredOrders = await Order.aggregate([
                {
                    $match: {
                        status: "Delivered",
                        createdAt: { $gte: startDate }
                    }
                }
            ]);

            let topProducts = [];
            let topCategories = [];

            // Top Products=======================
            if (dataType === "products") {
                const productSalesAggregation = await Order.aggregate([
                    { 
                        $match: { 
                            status: "Delivered",
                            createdAt: { $gte: startDate }
                        }
                    },
                    { 
                        $unwind: "$orderedItems" 
                    },
                    { 
                        $group: {
                            _id: "$orderedItems.productId", 
                            totalSales: { $sum: "$orderedItems.quantity" }
                        }
                    },
                    { 
                        $sort: { totalSales: -1 }
                    },
                    { 
                        $limit: 10 
                    },
                    {
                        $lookup: {
                            from: "products", // Product collection
                            localField: "_id", 
                            foreignField: "_id", 
                            as: "productDetails"
                        }
                    },
                    {
                        $project: {
                            productName: { $arrayElemAt: ["$productDetails.productName", 0] },
                            totalSales: 1
                        }
                    }
                ]);

                topProducts = productSalesAggregation;
            }

            // Top Categories=================
            if (dataType === "categories") {
                const categorySalesAggregation = await Order.aggregate([
                    { $match: { 
                        status: "Delivered",
                        createdAt: { $gte: startDate }
                     } },
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.productId",
                            foreignField: "_id",
                            as: "productDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "categories",
                            localField: "productDetails.category",
                            foreignField: "_id",
                            as: "categoryDetails",
                        },
                    },
                    {
                        $group: {
                            _id: { $arrayElemAt: ["$categoryDetails._id", 0] },
                            categoryName: { $first: { $arrayElemAt: ["$categoryDetails.name", 0] } },
                            totalSales: { $sum: "$orderedItems.quantity" },
                            // totalQuantity: { $sum: "$orderedItems.quantity" },
                            // totalSales: { $sum: "$orderedItems.totalPrice" },
                        },
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 },
                ]);

                topCategories = categorySalesAggregation;
            }

            // for chart
            const labels = [];
            const data = [];

            if (dataType === "products") {
                labels.push(...topProducts.map(product => product.productName));
                data.push(...topProducts.map(product => product.totalSales));
            } else if (dataType === "categories") {
                labels.push(...topCategories.map(category => category.categoryName));
                data.push(...topCategories.map(category => category.totalSales));

            }

            const orders = await Order.find();
            const noPendingOrder = await Order.find({ status: { $ne: 'Pending' } });
            const categories = await Category.find();
            const products = await Product.find();
            const totalRevenue = deliveredOrders.reduce((acc, order) => acc + (order.finalAmount || 0), 0);

            // Current Month Revenue
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const startOfNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
            const monthOrders = await Order.find({
                status: 'Delivered',
                createdAt: { $gte: startOfMonth, $lt: startOfNextMonth }
            });
            const monthlyRevenue = monthOrders.reduce((acc, order) => acc + (order.finalAmount || 0), 0);

            res.render("dashboard", {
                orders,
                noPendingOrder,
                categories,
                products,
                totalRevenue,
                monthlyRevenue,
                topProducts,
                topCategories,
                filterBy,
                dataType,
                chartLabels: labels,
                chartData: data
            });

        } catch (error) {
            console.error("Dashboard loading error:", error);
            res.redirect("/admin/login");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const adminErrorLoad = async (req, res) => {
    try {
        res.render('admin-error');
    } catch (error) {
        console.log("Eroor in adminError page")
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error in admin session destrying...", err);
                res.redirect('/admin/adminError');
            }
            res.redirect('/admin/login')
        });
    } catch (error) {
        res.redirect("/admin/login")
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