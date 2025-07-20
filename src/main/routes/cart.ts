import { Router, Request, Response } from "express";
import Cart from '../../models/Cart'
import Product from "../../models/Product";
import { authenticateToken } from "../../middleware/auth";

const router = Router();

// GET /api/v1/cart - Get user's cart
router.get("/cart", authenticateToken, async (req: any, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    res.status(200).json(cart || { items: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cart." });
  }
});

// POST /api/v1/cart/add - Add product to cart
router.post("/cart/add", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product){
        res.status(404).json({ error: "Product not found." });
        return;
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
    if (itemIndex > -1) {
      // Increment existing quantity
      cart.items[itemIndex].quantity += quantity || 1;
    } else {
      cart.items.push({ product: productId, quantity: quantity || 1 });
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to cart." });
  }
});

// POST /api/v1/cart/remove - Remove product from cart
router.post("/cart/remove", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart){
        res.status(404).json({ error: "Cart not found." });
        return;
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();

    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from cart." });
  }
});

// POST /api/v1/cart/clear - Clear cart
router.post("/cart/clear", authenticateToken, async (req: any, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart){
        res.status(404).json({ error: "Cart not found." });
        return
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ msg: "Cart cleared." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear cart." });
  }
});

// PUT /api/v1/cart/update/:productId - Update quantity of product in cart
router.put("/cart/update/:productId", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    console.log('productIdproductId', productId)

    if (quantity < 1) {
       res.status(400).json({ error: "Quantity must be at least 1." });
       return
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
       res.status(404).json({ error: "Cart not found." });
       return
    }

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) {
       res.status(404).json({ error: "Product not found in cart." });
       return
    }

    item.quantity = quantity;

    await cart.save();

    // Populate product for frontend response
    await cart.populate("items.product");

    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update cart quantity." });
  }
});


export default router;
