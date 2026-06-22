import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IPs/hostnames usados para acessar o dev server na rede local (HMR)
  allowedDevOrigins: ["192.168.3.56"],
};

export default nextConfig;
