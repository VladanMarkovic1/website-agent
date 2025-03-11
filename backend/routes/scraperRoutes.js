import express from "express";
import { scrapeBusiness } from "../controllers/scraperController.js";

const router = express.Router();

// ✅ Call the controller function for scraping
router.get("/scrape/:businessId", scrapeBusiness);

export default router;
