const Category = require('../../models/categorySchema')
const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema')


const loadProduct = async (req, res) => {
    if (req.session.admin) {
        try {
            const categories = await Category.find({ isListed: true }, { name: 1 })
            res.render('add product/productAdd', { categories })

        } catch (error) {
            console.log('error in page load', error);

        }
    } else {
        res.redirect('/admin/login')
    }
}

const addProduct = async (req, res) => {
    try {
        console.log(req.files); // Files uploaded to Cloudinary

        const imageUrls = req.files.map(file => file.path); // Cloudinary URLs
        const categoryId = await Category.findOne({ name: req.body.category }, { _id: 1 })
        let totalStocks = 0

        console.log(imageUrls)
        // console.log(categoryName)
        const variantArray = JSON.parse(JSON.stringify(req.body.variant))
        const variants = variantArray.map((size, index) => {
            totalStocks = totalStocks + Number(variantArray[index].stock)
            return {
                size: variantArray[index].size,
                price: Number(variantArray[index].price),
                stock: Number(variantArray[index].stock)
            }
        })
        console.log('stock:', totalStocks)
        console.log(variants)

        const newProduct = new Product({
            productName: req.body.name,
            description: req.body.description,
            category: categoryId,
            // subcategory: req.body.subcategory,
            totalStocks: totalStocks,
            regularPrice: req.body.price,
            offerPrice: req.body.offerPrice,
            color: req.body.colour,
            // taxId: req.body.taxId,
            images: imageUrls,
            variant: variants
        });

        await newProduct.save();
        console.log("product added successfully")
        res.status(200).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Error adding product', error });
    }
};

const productList = async (req, res) => {
    if(req.session.admin){
    try {
        const products = await Product.find()
        const category = await Category.find()

        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = parseInt(req.query.limit) || 10; // Number of products per page
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments(); // Total number of products
        const productCount = await Product.find()
            .skip(skip)
            .limit(limit);


        console.log(products)
        res.render('add product/productList', {
            products,
            productCount,
            category, currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts
        })
    
    } catch (error) {
        console.log("error in product list", error)
    }
}else{
    res.redirect('/admin/login')
}
}

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id)
        const result = await Product.deleteOne({ _id: id });
        console.log("deleted count = ", result.deletedCount)

        if (result.deletedCount === 1) {
            console.log("inside success delete Product")
            res.status(200).send('Product deleted successfully');
        } else {
            console.log("inside failed delete Product")
            res.status(404).send('Product not found');
        }
    } catch (error) {
        console.log('error in product deleting', error)
        res.status(500).send('error in product deleting');
    }
}

const editProduct = async (req, res) => {
    try {
        console.log(req.body)
        const { productName, description, category, regularPrice, offerPrice, totalStocks, color } = req.body;
        const { id } = req.params;

        let updatedFields = {}
        const categoryId = await Category.find({ name: category }, { _id: 1 })
        if (productName !== undefined && productName.trim() !== '') updatedFields.productName = productName;
        if (description !== undefined && description.trim() !== '') updatedFields.description = description;
        if (category !== undefined && category.trim() !== '') updatedFields.category = categoryId._id;
        if (regularPrice !== undefined && regularPrice.trim() !== '') updatedFields.regularPrice = Number(regularPrice);
        if (totalStocks !== undefined && totalStocks.trim() !== '') updatedFields.totalStocks = Number(totalStocks);
        if (offerPrice !== undefined && offerPrice.trim() !== '') updatedFields.offerPrice = Number(offerPrice);
        if (color !== undefined && color.trim() !== '') updatedFields.color = color;


        const updateProduct = await Product.findOneAndUpdate({ _id: id }, updatedFields, { new: true })
        if (!updateProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(201).json({ message: 'Product Edit successfull' })
        console.log('Product updated successfully', updateProduct)

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product', error });
    }
}

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect(`/admin/productList`);
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in block product", error)
    }
}
const unBlockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect(`/admin/productList`);
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in unblock product", error)
    }
}

const updateImages = async (req,res)=>{
    try {
        const { id } = req.params;
        console.log('id is:',id)
    console.log(req.files); // Files uploaded to Cloudinary

    const imageUrls = req.files.map(file => file.path); // Cloudinary URLs
    
    console.log(imageUrls)
    const updateImg = await Product.updateOne({_id:id},{
        images:imageUrls
    })
    if(!updateImg){
        res.status(404).json({ message: 'Product not found' })
    }
    res.status(200).json({ message: 'Product updated' })

    } catch (error) {
        console.log("error in update images",error)
    }
}

const loadManageStock = async (req,res)=>{
    try {
        const products = await Product.aggregate([{$unwind:"$variant"}])
        res.render('add product/manageStock',{products})
    } catch (error) {
        console.log(error)
    }
}
module.exports = {
    loadProduct,
    addProduct,
    productList,
    deleteProduct,
    editProduct,
    blockProduct,
    unBlockProduct,
    updateImages,
    loadManageStock
}