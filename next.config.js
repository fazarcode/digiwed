const nextConfig = {
  allowedDevOrigins: [
    "*.emergentagent.com",
    "*.emergentcf.cloud",
    "weddings-inspect.preview.emergentagent.com",
    "weddings-inspect.cluster-5.preview.emergentcf.cloud",
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "adm-zip", "pdfkit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: [
        "weddings-inspect.preview.emergentagent.com",
        "weddings-inspect.cluster-5.preview.emergentcf.cloud",
        "localhost:3000",
        "*.emergentagent.com",
        "*.emergentcf.cloud",
      ],
    },
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/storage/**"],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
