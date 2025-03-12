export const serviceInfo = {
    "Cosmetic Dentistry": {
        name: "Cosmetic Dentistry",
        description: "aesthetic dental enhancement procedures",
        benefits: "improve the appearance of your smile",
        features: "variety of treatments including bonding, veneers, and whitening",
        timeline: "varies by specific treatment",
        pricing: {
            range: "$300-$5,000+",
            features: "customized treatment plans for your smile goals"
        }
    },
    "Veneers": {
        name: "Veneers",
        description: "custom-made, ultra-thin porcelain shells",
        benefits: "transform your smile with natural-looking results",
        features: "precise color matching and comfortable fit",
        timeline: "2-3 weeks from consultation to final placement",
        pricing: {
            range: "$800-$2,500 per tooth",
            features: "custom design, temporary veneers, and final placement"
        }
    },
    "Pediatric Dentistry": {
        name: "Pediatric Dentistry",
        description: "specialized dental care for children",
        benefits: "ensure proper dental development and oral health",
        features: "child-friendly environment and gentle approach",
        timeline: "regular check-ups every 6 months",
        pricing: {
            range: "$50-$300 per visit",
            features: "preventive care, cleanings, and treatments"
        }
    },
    "Braces & Aligners": {
        name: "Braces & Aligners",
        description: "orthodontic treatment options",
        benefits: "straighten teeth and improve bite alignment",
        features: "traditional braces and clear aligner options",
        timeline: "12-24 months average treatment time",
        pricing: {
            range: "$3,000-$7,000",
            features: "complete orthodontic treatment including follow-ups"
        }
    },
    "Oral and Facial Surgery": {
        name: "Oral and Facial Surgery",
        description: "specialized surgical procedures",
        benefits: "address complex dental and facial issues",
        features: "advanced surgical techniques and sedation options",
        timeline: "varies by procedure",
        pricing: {
            range: "$500-$25,000+",
            features: "depends on specific surgical needs"
        }
    },
    "Root Canal Treatment": {
        name: "Root Canal Treatment",
        description: "endodontic therapy",
        benefits: "save infected teeth and relieve pain",
        features: "modern techniques for comfortable treatment",
        timeline: "1-2 appointments",
        pricing: {
            range: "$700-$1,500 per tooth",
            features: "complete procedure including filling"
        }
    },
    "Teeth Whitening": {
        name: "Teeth Whitening",
        description: "professional whitening treatment",
        benefits: "brighten your smile several shades",
        features: "safe and effective whitening methods",
        timeline: "1-2 hours per session",
        pricing: {
            range: "$200-$1,000",
            features: "in-office or take-home options"
        }
    },
    "Dental Implants": {
        name: "Dental Implants",
        description: "permanent tooth replacement solution",
        benefits: "restore natural appearance and function",
        features: "titanium posts with custom crowns",
        timeline: "3-6 months total treatment time",
        pricing: {
            range: "$3,000-$4,500 per implant",
            features: "implant, abutment, and crown"
        }
    },
    "Wisdom Tooth Extraction": {
        name: "Wisdom Tooth Extraction",
        description: "removal of third molars",
        benefits: "prevent complications and relieve pain",
        features: "surgical extraction with sedation options",
        timeline: "45-90 minutes procedure, 1-week recovery",
        pricing: {
            range: "$200-$700 per tooth",
            features: "extraction and aftercare"
        }
    },
    "Restorative Dentistry": {
        name: "Restorative Dentistry",
        description: "repair and restore damaged teeth",
        benefits: "restore function and appearance",
        features: "fillings, crowns, bridges, and dentures",
        timeline: "varies by procedure",
        pricing: {
            range: "$200-$3,000+",
            features: "depends on restoration needed"
        }
    },
    "Prosthodontics": {
        name: "Prosthodontics",
        description: "specialized dental prosthetics",
        benefits: "replace missing teeth and restore oral function",
        features: "dentures, bridges, and complex restorations",
        timeline: "2-6 weeks depending on treatment",
        pricing: {
            range: "$1,000-$8,000+",
            features: "custom prosthetic solutions"
        }
    },
    "Preventive Dentistry": {
        name: "Preventive Dentistry",
        description: "comprehensive preventive care",
        benefits: "maintain oral health and prevent problems",
        features: "cleanings, exams, and preventive treatments",
        timeline: "regular visits every 6 months",
        pricing: {
            range: "$75-$300 per visit",
            features: "cleaning, exam, and x-rays"
        }
    }
};

export const getAllServiceNames = () => {
    return Object.keys(serviceInfo);
};