const Category = require('../../models/categorySchema')
const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema')
const httpStatusCode = require('../../helpers/httpStatusCode');
const HttpStatusCode = require('../../helpers/httpStatusCode');


const loadProduct = async (req, res) => {
        try {
            const categories = await Category.find({ isListed: true }, { name: 1 })
            res.render('add product/productAdd', { categories })

        } catch (error) {
            res.redirect("/admin/login")
            console.log('error in page load', error);

        }
}

const addProduct = async (req, res) => {
    try {
        const imageUrls = req.files.map(file => file.path); // Cloudinary URLs
        const categoryId = await Category.findOne({ name: req.body.category }, { _id: 1 })
        let totalStocks = 0

        const variantArray = JSON.parse(JSON.stringify(req.body.variant))
        const variants = variantArray.map((size, index) => {
            totalStocks = totalStocks + Number(variantArray[index].stock)
            return {
                size: variantArray[index].size,
                price: Number(variantArray[index].price),
                stock: Number(variantArray[index].stock)
            }
        })

        const newProduct = new Product({
            productName: req.body.name,
            description: req.body.description,
            category: categoryId,
            totalStocks: totalStocks,
            regularPrice: req.body.price,
            offerPrice: req.body.offerPrice,
            color: req.body.colour,
            images: imageUrls,
            variant: variants
        });

        await newProduct.save();
        res.status(httpStatusCode.OK).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Error adding product', error });
    }
};

const productList = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1; 
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalProducts = await Product.countDocuments();
            const products = await Product.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const category = await Category.find();

            res.render('add product/productList', {
                products,
                category,
                currentPage: page,
                totalPages: Math.ceil(totalProducts / limit),
                totalProducts
            });
        } catch (error) {
            console.log("Error in product list", error);
            res.status(httpStatusCode.INTERNAL_SERVER_ERROR).send("Server error while fetching products");
        }
   
};


const editProduct = async (req, res) => {
    try {
        const { productName, description, category, regularPrice, offerPrice, color } = req.body;
        const productId  = req.params.id;

        let updatedFields = {}
        const categoryId = await Category.find({ name: category }, { _id: 1 })
        if (productName !== undefined && productName.trim() !== '') updatedFields.productName = productName;
        if (description !== undefined && description.trim() !== '') updatedFields.description = description;
        if (category !== undefined && category.trim() !== '') updatedFields.category = categoryId._id;
        if (regularPrice !== undefined && regularPrice.trim() !== '') updatedFields.regularPrice = Number(regularPrice);
        if (offerPrice !== undefined && offerPrice.trim() !== '') updatedFields.offerPrice = Number(regularPrice)*((100-Number(offerPrice))/100);
        if (color !== undefined && color.trim() !== '') updatedFields.color = color;


        const updateProduct = await Product.findOneAndUpdate({ _id: productId }, updatedFields, { new: true })
        if (!updateProduct) {
            return res.status(httpStatusCode.NOT_FOUND).json({ message: 'Product not found' });
        }
        res.status(httpStatusCode.CREATED).json({ message: 'Product Edit successfull' })

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update product', error });
    }
}

const blockProduct = async (req, res) => {
    try {
        let productId = req.query.id;
        await Product.updateOne({ _id: productId }, { $set: { isBlocked: true } });
        res.redirect(`/admin/productList`);
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in block product", error)
    }
}
const unBlockProduct = async (req, res) => {
    try {
        let productId = req.query.id;
        await Product.updateOne({ _id: productId }, { $set: { isBlocked: false } });
        res.redirect(`/admin/productList`);
    } catch (error) {
        res.redirect('/admin/admin-error');
        console.log("error in unblock product", error)
    }
}

const updateImages = async (req,res)=>{
    try {
        const productId  = req.params.id;

    const imageUrls = req.files.map(file => file.path);
    
    console.log(imageUrls)
    const updateImg = await Product.updateOne({_id:productId},{
        images:imageUrls
    })
    if(!updateImg){
        res.status(httpStatusCode.NOT_FOUND).json({ message: 'Product not found' })
    }
    res.status(httpStatusCode.OK).json({ message: 'Product updated' })

    } catch (error) {
        console.log("error in update images",error)
    }
}

  

const editVariantLoad = async (req,res)=>{
    try {
        const productId = req.query.productId
        const product = await Product.findOne({_id:productId})
        res.render('add product/editVariant',{
            product
        })
    } catch (error) {
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({success:false})
    }
}

const variantUpdate = async (req,res)=>{
    try {
        const {variantId,variantPrice,variantStock} = req.body;
        console.log(variantId,typeof variantPrice,typeof variantStock);
        await Product.updateOne({'variant._id':variantId},{$set:{'variant.$.stock':variantStock,'variant.$.price':variantPrice}});
        res.status(HttpStatusCode.OK).json({success:true})
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({success:false})
    }
}

const blockVariant = async (req,res)=>{
    try {
        const variantId = req.params.variantId;
        await Product.updateOne({'variant._id':variantId},{$set:{'variant.$.isBlocked':true}})
        res.status(HttpStatusCode.OK).json({success:true})
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({success:false})
    }
}
const unblockVariant = async (req,res)=>{
    try {
        const variantId = req.params.variantId;
        await Product.updateOne({'variant._id':variantId},{$set:{'variant.$.isBlocked':false}})
        res.status(HttpStatusCode.OK).json({success:true})
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({success:false})
    }
}

const addVariant = async (req,res)=>{
    try {
        const {productId} = req.query;
        const {variantSize,variantPrice,variantStock} = req.body;
        const sizeFound = await Product.findOne({'variant.size':variantSize})
        if(sizeFound){
            return res.status(HttpStatusCode.FORBIDDEN).json({message:`Size : ${variantSize}   Already exist` })
        }
        const newVariant = {
            stock:variantStock,
            price:variantPrice,
            size:variantSize
        }
        await Product.updateOne({_id:productId},{$push:{variant:newVariant}})
        const product = await Product.findOne({_id:productId});
        res.status(HttpStatusCode.OK).json({product})
    } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({success:false})
    }
}
module.exports = {
    loadProduct,
    addProduct,
    productList,
    editProduct,
    blockProduct,
    unBlockProduct,
    updateImages,

    editVariantLoad,
    variantUpdate,
    blockVariant,
    unblockVariant,
    addVariant
}