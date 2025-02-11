import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js"


function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

// function for add product
const addProduct = async (req, res) => {
    try {

        const { name, description, price, category, subCategory, sizes, bestseller } = req.body

        const image1 = req.files.image1 && req.files.image1[0]
        const image2 = req.files.image2 && req.files.image2[0]
        const image3 = req.files.image3 && req.files.image3[0]
        const image4 = req.files.image4 && req.files.image4[0]

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined)

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url
            })
        )

        const productData = {
            name,
            description,
            category,
            price: Number(price),
            subCategory,
            bestseller: bestseller === "true" ? true : false,
            sizes: JSON.parse(sizes),
            image: imagesUrl,
            date: Date.now()
        }

        // console.log(productData);

        const product = new productModel(productData);
        await product.save()

        res.json({ success: true, message: "Product Added" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for list product
const listProducts = async (req, res) => {
    try {
       
        const products = await productModel.find({});
    //     const productsPrint = JSON.stringify(products);
    //    console.log("productsPrint: ", productsPrint);
        res.json({success:true,products})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const setReviews = async (req, res) => {
    const { _id,userId, rating, comment } = req.body
    console.log(userId, rating, comment);

    try{
        await productModel.updateOne(
            { _id: _id }, 
            { $push: { reviews: { userId: userId, comment: comment, rating: rating, date: new Date() } } }
        );
        res.json({ success: true, message: "Review Added" })

} catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
}




}



// function for removing product
const removeProduct = async (req, res) => {
    try {
        
        await productModel.findByIdAndDelete(req.body.id)
        res.json({success:true,message:"Product Removed"})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for single product info
const singleProduct = async (req, res) => {
    try {
        
        const { productId } = req.body
        const product = await productModel.findById(productId)
        res.json({success:true,product})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//new function
const editProduct = async (req, res) => {

    //    const reqbody = JSON.stringify(req.body);
    //    const oneProduct = JSON.stringify(req.body[0]);
    //     console.log("reqbody: " + reqbody);
    //     console.log("oneProduct :" + oneProduct)

    const updates = req.body; // Array of objects
    try {
      for (const item of updates) {
        const filter = { _id: item._id }; // Filter by _id
        const update = {
          $set: {
            name: item.name,
            description: item.description,
            category: item.category,
            price: item.price
            // Add other fields if needed
          },
        };
  
        // Update the document
        await productModel.updateOne(filter, update);
      }
  
      res.json({ success: true, message: "Products updated successfully" });
    } catch (error) {
      console.error('Error updating products:', error);
      res.status(500).json({ message: 'Failed to update products' });
    }

    // try {
    //    const reqbody = JSON.stringify(req.body);
    //    const oneProduct = JSON.stringify(req.body[0]);
    //     console.log("reqbody: " + reqbody);
    //     console.log("oneProduct :" + oneProduct)

        
    //     if(isEmpty(req.body) === true){
    //         throw "No Change has been made"
    //     }else{
            
    //         const product = req.body[0]
    //         const productId = req.body[0]._id
    //       const updatedProduct = await productModel.updateOne({productId},{$set:{name:"test"}} )
    //   }


    //     res.json({ success: true, message: "Products updated successfully" })

    
    // } catch (error) {
    //     console.log(error)
    //     res.json({ success: false, message: error.message })
    // }
}


const getCategories = async (req, res) => {
    
    try {
        
        const categories = await productModel.find({}, 'category')
        res.json({success:true,categories})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}




export {editProduct, listProducts, addProduct, removeProduct, singleProduct, setReviews, getCategories }