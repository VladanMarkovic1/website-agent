import express from "express";
import { scrapeBusiness } from "../scraper/scraperController.js";

const router = express.Router();

// Route for triggering scraping of a specific business by businessId
router.get("/:businessId", scrapeBusiness);

export default router;
