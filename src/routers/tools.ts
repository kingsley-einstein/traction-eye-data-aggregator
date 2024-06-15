import { Router } from "express";
import { getAllLPByUser, getAllLPForDEX, getLPDataForUser } from "../controllers/tools";

const router = Router();

router.get("/lps/:dex", getAllLPForDEX);
router.get("/lps/:dex/:wallet", getAllLPByUser);
router.get("/lps/:dex/:pool/:wallet", getLPDataForUser);

export default router;
