const Category = require('../../models/categorySchema')
const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema')


const loadProduct = async (req, res) => {
    if (req.session.admin) {
        try {
            const categories = await Category.find({ isListed: true }, { name: 1 })
            res.render('add product/productAdd', { categories })

        } catch (error) {
            res.redirect("/admin/login")
            console.log('error in page load', error);

        }
    } else {
        res.redirect('/admin/login')
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
        res.status(200).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Error adding product', error });
    }
};

const productList = async (req, res) => {
    if (req.session.admin) {
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
            res.status(500).send("Server error while fetching products");
        }
    } else {
        res.redirect('/admin/login');
    }
};


const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await Product.deleteOne({ _id: productId });

        if (result.deletedCount === 1) {
            res.status(200).send('Product deleted successfully');
        } else {
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
        const { productName, description, category, regularPrice, offerPrice, color } = req.body;
        const { productId } = req.params;

        let updatedFields = {}
        const categoryId = await Category.find({ name: category }, { _id: 1 })
        if (productName !== undefined && productName.trim() !== '') updatedFields.productName = productName;
        if (description !== undefined && description.trim() !== '') updatedFields.description = description;
        if (category !== undefined && category.trim() !== '') updatedFields.category = categoryId._id;
        if (regularPrice !== undefined && regularPrice.trim() !== '') updatedFields.regularPrice = Number(regularPrice);
        if (offerPrice !== undefined && offerPrice.trim() !== '') updatedFields.offerPrice = Number(offerPrice);
        if (color !== undefined && color.trim() !== '') updatedFields.color = color;


        const updateProduct = await Product.findOneAndUpdate({ _id: productId }, updatedFields, { new: true })
        if (!updateProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(201).json({ message: 'Product Edit successfull' })

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product', error });
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
        const { productId } = req.params;

    const imageUrls = req.files.map(file => file.path);
    
    console.log(imageUrls)
    const updateImg = await Product.updateOne({_id:productId},{
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


const loadManageStock = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; 
      const limit = 10;
      const skip = (page - 1) * limit; 
      const totalProducts = await Product.aggregate([{ $unwind: "$variant" }]).count("count");
      const totalPages = Math.ceil(totalProducts[0]?.count / limit);
  
      const products = await Product.aggregate([
        { $unwind: "$variant" },
        { $skip: skip },
        { $limit: limit }
      ]);
  
      res.render('add product/manageStock', {
        products,
        totalPages,
        currentPage: page
      });
    } catch (error) {
      console.error("Error in loadManageStock:", error);
      res.redirect("/admin/login");
    }
  };
  

const updateStock = async (req,res)=>{
    try {
        const {variantId,stock} = req.body;
        console.log(variantId,stock);
        const result = await Product.updateOne({'variant._id':variantId},{$inc:{['variant.$.stock']:Number(stock)}})
        if(result){
            res.status(200).json({success:true});
        }
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
    loadManageStock,
    updateStock
}