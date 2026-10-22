import type { NextConfig } from "next";

// A static export: Vercel serves the files in out/, and vercel.json holds the
// redirects and headers that a static export cannot declare.
const config: NextConfig = {
  output: "export",
  devIndicators: false,
};

export default config;
