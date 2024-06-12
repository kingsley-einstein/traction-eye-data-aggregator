import { Router } from "express";
import { getAllLPForDEX } from "../controllers/tools";

const router = Router();

router.get("/lps/:dex", getAllLPForDEX);

export default router;
