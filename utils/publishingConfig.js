const CONFIG_MAP = {
  // Page Builder (Webpages)
  website: {
    canPublish: true,
    downloadFormats: ["html", "json", "pdf", "png", "jpg"],
  },
  landing_page: {
    canPublish: true,
    downloadFormats: ["html", "json", "pdf", "png", "jpg"],
  },
  link_in_bio: {
    canPublish: true,
    downloadFormats: ["html", "json", "pdf", "png", "jpg"],
  },
  web: {
    canPublish: true,
    downloadFormats: ["html", "json", "pdf", "png", "jpg"],
  },

  // Page Builder (Non-Webpages)
  social_post: { canPublish: false, downloadFormats: ["png", "jpg", "pdf"] },
  thumbnail: { canPublish: false, downloadFormats: ["png", "jpg", "pdf"] },
  banner: { canPublish: false, downloadFormats: ["png", "jpg", "pdf"] },
  cover: { canPublish: false, downloadFormats: ["png", "jpg", "pdf"] },
  flyer: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  poster: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  brochure: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  business_card: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  certificate: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  menu: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  infographic: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  presentation: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },

  // Email Builder
  newsletter: { canPublish: false, downloadFormats: ["html", "json"] },
  marketing_email: { canPublish: false, downloadFormats: ["html", "json"] },
  transactional_email: { canPublish: false, downloadFormats: ["html", "json"] },
  email_signature: { canPublish: false, downloadFormats: ["html", "json"] },

  // Document Builder
  resume: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  cover_letter: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  proposal: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  invoice: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  letterhead: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  report: { canPublish: false, downloadFormats: ["pdf", "png", "jpg"] },
  general_document: {
    canPublish: false,
    downloadFormats: ["pdf", "png", "jpg"],
  },
};

module.exports = {
  CONFIG_MAP,
  getPublishConfig: (contentType) => {
    return (
      CONFIG_MAP[contentType] || { canPublish: false, downloadFormats: [] }
    );
  },
};
