import { Router } from "express";
import deliveryRoutes from "./modules/inventory/delivery.route";
import inventoryMovementRoutes from "./modules/inventory-movements/inventory-movement.route";
import inventoryUnitRoutes from "./modules/inventory-units/inventory-unit.route";
import stockLocationRoutes from "./modules/stock-locations/stock-location.route";
import supplierRoutes from "./modules/suppliers/supplier.route";

const router = Router();

router.use(inventoryUnitRoutes);
router.use(inventoryMovementRoutes);
router.use(stockLocationRoutes);
router.use(supplierRoutes);
router.use(deliveryRoutes);

export default router;
