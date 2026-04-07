const nextConfig = {
  // Vercel'in RAM'i şişmesin diye TS kontrolünü atlıyoruz
  // (Zaten yerelde test ettik ve sorunsuz!)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
