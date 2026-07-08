/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit", "fontkit", "restructure", "iconv-lite"]
};

export default nextConfig;
