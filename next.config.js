/** @type {import('next').NextConfig} */
const nextConfig = {
  // FOR LOCAL NETWORK ACCESS (other devices on same WiFi):
  // This allows Next.js dev server to accept connections from your local IP
  
  // FOR PRODUCTION:
  // Remove or comment out the experimental section below
  
  experimental: {
    // Allow connections from any host on local network
  },
};

export default nextConfig;
