const Category = require("../../models/categorySchema");


const categoryInfo = async (req,res)=>{
    try {

        

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            categoryData,
            currentPage : page,
            totalPages,
            totalCategories
        });

    } catch (error) {
        console.log('error in admin category page...',error);
        res.redirect('/admin/admin-error');
    }
}

const addCategory = async (req,res)=>{
    try {
        console.log('data from frontend : ',req.body)
        const {name,description} = req.body;
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({erorr:"Category already exists"});
        }
        const newCategory = new Category({
            name,
            description
        });
        await newCategory.save();
        console.log("category added to database");
        return res.json({message:"Category added successfully"})

    } catch (error) {
        console.log("add category error",error);
        return res.status(500).json({error:"Internal server error"})
    }
}



module.exports = {
    categoryInfo,
    addCategory
}