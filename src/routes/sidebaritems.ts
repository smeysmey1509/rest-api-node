import {Router} from "express";
import SidebarItem from "../../models/SidebarItem";

const router = Router();

router.post('/sidebar-items', async (req,  res) => {
    const {name, path, icon, order, type, parentId} = req.body;

    const item = new SidebarItem({name, path, icon, order, type, parentId});

    await item.save();

    res.status(200).json({item})

})

router.get("/sidebar-tree", async (_req, res) => {
    const items = await SidebarItem.find().sort({ order: 1 }).lean();

    // Build a tree
    const map = new Map();
    items.forEach(item => map.set(item._id.toString(), { ...item, children: [] }));

    const tree: any[] = [];

    items.forEach(item => {
        if (item.parentId) {
            const parent = map.get(item.parentId.toString());
            if (parent) {
                parent.children.push(map.get(item._id.toString()));
            }
        } else {
            tree.push(map.get(item._id.toString()));
        }
    });

    res.json(tree);
});

export default router;

