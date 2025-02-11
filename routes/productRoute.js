import express from 'express'
import { editProduct, listProducts, addProduct, removeProduct, singleProduct,setReviews, getCategories} from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js'


const productRouter = express.Router();

productRouter.post('/add',adminAuth,upload.fields([{name:'image1',maxCount:1},{name:'image2',maxCount:1},{name:'image3',maxCount:1},{name:'image4',maxCount:1}]),addProduct);
productRouter.post('/remove',adminAuth,removeProduct);
productRouter.post('/single',singleProduct);
productRouter.get('/list',listProducts)
productRouter.post('/edit',adminAuth,editProduct)
productRouter.post('/reviews',authUser,setReviews)
productRouter.get('/categories',getCategories)


export default productRouter