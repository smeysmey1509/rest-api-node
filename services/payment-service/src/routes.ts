import { Router } from "express";
import paymentRoutes from "./modules/payments/payment.route";

const router = Router();

router.use(paymentRoutes);

export default router;
