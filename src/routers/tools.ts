import { Router } from "express";
import { getAllLPByUser, getAllLPForDEX } from "../controllers/tools";

const router = Router();

router.get("/lps/:dex", getAllLPForDEX);
router.get("/lps/:dex/:wallet", getAllLPByUser);

export default router;
