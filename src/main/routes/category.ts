import { Router, Request, Response } from "express";
import Category from "../models/Category";
import Product from "../models/Product";

const router = Router();

router.get("/category", async (req, res) => {
    try{
        const categories = await Category.find({})
        console.log("category:", categories)
        res.status(200).json(categories);
    }catch(err){
        res.status(500).json({message: 'Failed to fetch categories', err})
    }
})

router.post('/category', async (req: Request, res: Response) => {
    try{
        const {name, description} = req.body
        const category = await Category.create({name, description})
        res.status(200).json(category)
    }catch (err: any){
        res.status(400).json({error: err.message})
    }
})

router.put('/category/:id', async (req: Request, res: Response): Promise<any> => {
    try{
        const { id } = req.params
        const {name, description} = req.body
        const updateCategory = await Category.findByIdAndUpdate(id, {name, description}, {new: true, runValidations: true})
        if (!updateCategory){
            return res.status(404).json({message: "Category not found."})
        }
        res.json(updateCategory)
    }catch (e) {
        res.status(500).json({message: "Failed to update cagory.", e})
    }
})

router.delete("/category/:id", async (req: Request, res: Response): Promise<any> => {
    try{
        const {id } = req.params

        const usedByProduct = await Product.exists({category: id})

        if (usedByProduct){
            return res.status(400).json({
                message: "Cannot delete category because some products are still assigned to it."
            })
        }

        const deletedGategory = await Category.findByIdAndDelete(id)

        if(!deletedGategory){
            return res.status(404).json({
                message: "Categor not found."
            })
        }

        res.json({message: "Category delete successfuly"})

    }catch (e) {
        res.status(401).json({message: 'Failed to delete category.', e})
    }
})

export default router;
