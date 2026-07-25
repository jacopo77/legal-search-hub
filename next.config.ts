import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public buckets (firm logos, gallery, city heroes).
      {
        protocol: "https",
        hostname: "rxycqygjwuhzfwevmqdj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
