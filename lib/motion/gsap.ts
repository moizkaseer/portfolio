"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

// Plugins are registered once, here; import further plugins per use (brief §9).
gsap.registerPlugin(ScrollTrigger, CustomEase);

export { gsap, ScrollTrigger, CustomEase };
