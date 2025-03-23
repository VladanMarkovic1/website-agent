import express from "express";
import { scrapeBusiness } from "../scraper/scraperController.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkBusinessOwner } from "../middleware/checkBusinessOwner.js";

const router = express.Router();

// Protect the route so that only authenticated users can trigger scraping for their own business
router.get("/:businessId", authenticateToken, checkBusinessOwner, scrapeBusiness);

export default router;
