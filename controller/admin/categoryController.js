const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const httpStatusCode = require('../../helpers/httpStatusCode')


const categoryInfo = async (req, res) => {
    if(req.session.admin){
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('category', {
            categoryData,
            currentPage: page,
            totalPages,
            totalCategories
        });

    } catch (error) {
        console.log('error in admin category page...', error);
        res.redirect('/admin/admin-error');
    }
}else{
    res.redirect('/admin/login')
}
}

const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({ error: "409" });
        }
        const newCategory = new Category({
            name,
            description
        });
        await newCategory.save();
        return res.json({ message: "Category added successfully" })

    } catch (error) {
        console.log("add category error", error);
        return res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal server error....HAI" })
    }
}




const addOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPrice } = req.body;
        await Category.updateOne({ _id: id }, { $set: { categoryOffer: newPrice } })
        const products = await Product.find({category:id})

        for (const product of products) {
            const offerPrice = product.regularPrice * ((100 - newPrice) / 100);
            await Product.updateOne(
                { _id: product._id }, 
                { $set: { offerPrice: offerPrice } }
            );
        }
        res.status(httpStatusCode.CREATED).json({ success: true, message: 'Offer added successfully' });
    } catch (error) {
        console.log("Error in add category offer", error);
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to add offer', error: err });
    }
}

const removeOffer = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: 0 } });

        //up
        const products = await Product.find({category:categoryId})
        for (const product of products) {
            const offerPrice = 0;
            await Product.updateOne(
                { _id: product._id }, 
                { $set: { offerPrice: offerPrice } }
            );
        }
        res.status(httpStatusCode.CREATED).json({ success: true, message: 'Offer is removed Successfully' })
    } catch (error) {
        console.log("Error in removing category offer", error);
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ success: true, message: "Error in removing offer" })
    }
}

const editCategory = async (req, res) => {
    if (req.session.admin) {
        try {

            const { name, description, isListed } = req.body
            const { categoryId } = req.params;
            
            let updatedFields = { isListed }
            if (name !== undefined && name.trim() !== '') updatedFields.name = name;
            if (description !== undefined && description.trim() !== '') updatedFields.description = description;

            const updateCategory = await Category.findOneAndUpdate({ _id: categoryId }, updatedFields, { new: true })

            if (!updateCategory) {
                return res.status(httpStatusCode.NOT_FOUND).json({ message: 'Category not found' });
            }
            res.status(httpStatusCode.CREATED).json({ message: 'Edit successfull' })
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({ message: 'Failed to update category', error });
        }
    } else {
        res.redirect('/admin/login')
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addOffer,
    removeOffer,
    editCategory
}