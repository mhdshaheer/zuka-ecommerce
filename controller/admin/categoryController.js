const Category = require("../../models/categorySchema");
const { updateOne } = require("../../models/userSchema");


const categoryInfo = async (req, res) => {
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
}

const addCategory = async (req, res) => {
    try {
        console.log('data from frontend : ', req.body)
        const { name, description } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ erorr: "Category already exists" });
        }
        const newCategory = new Category({
            name,
            description
        });
        await newCategory.save();
        console.log("category added to database");
        return res.json({ message: "Category added successfully" })

    } catch (error) {
        console.log("add category error", error);
        return res.status(500).json({ error: "Internal server error....HAI" })
    }
}


const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const result = await Category.deleteOne({ _id: id });
        console.log("deleted count = ", result.deletedCount)

        if (result.deletedCount === 1) {
            console.log("inside success delete category")
            res.status(200).send('Category deleted successfully');
        } else {
            console.log("inside failed delete category")
            res.status(404).send('Category not found');
        }
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).send('Failed to delete category');
    }
};

const addOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPrice } = req.body;
        console.log("new price is :", newPrice);
        await Category.updateOne({ _id: id }, { $set: { categoryOffer: newPrice } })
        res.status(201).json({ success: true, message: 'Offer added successfully' });
    } catch (error) {
        console.log("Error in add category offer", error);
        res.status(500).json({ success: false, message: 'Failed to add offer', error: err });
    }
}

const removeOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.updateOne({ _id: id }, { $set: { categoryOffer: 0 } });
        res.status(201).json({ success: true, message: 'Offer is removed Successfully' })
    } catch (error) {
        console.log("Error in removing category offer", error);
        res.status(500).json({ success: true, message: "Error in removing offer" })
    }
}

const editCategory = async (req, res) => {
    try {
        console.log('category details:', req.body)
        const { name, description,isListed } = req.body
        const {id}=req.params;
        let updatedFields = {isListed}
        if (name !== undefined && name.trim() !== '') updatedFields.name = name;
        if (description !== undefined && description.trim() !== '') updatedFields.description = description;
        // if (isListed !== undefined && isListed.trim() !== '') updatedFields.isListed = isListed;

        const updateCategory = await Category.findOneAndUpdate({_id:id},updatedFields,{new:true})

        if (!updateCategory ) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(201).json({ message: 'Edit successfull' })
        console.log('category updated successfully',updateCategory)
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Failed to update category', error });
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    deleteCategory,
    addOffer,
    removeOffer,
    editCategory
}