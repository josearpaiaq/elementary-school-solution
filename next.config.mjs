/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Guardians upload pickup-person photos through server actions. Vercel caps bodies at 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
