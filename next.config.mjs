/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Guardians upload pickup-person photos through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
