import { z } from 'zod';

export const linkGroupSchema = z.enum(['hero_cta', 'professional', 'social']);
export type LinkGroup = z.infer<typeof linkGroupSchema>;

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Must be an http or https URL.');

const internalPathSchema = z
  .string()
  .trim()
  .regex(/^\/[^\s]*$/, 'Must be a site-relative path that starts with "/".');

const dataImageSchema = z
  .string()
  .trim()
  .regex(/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i, 'Must be a valid image data URL.');

const mailtoSchema = z
  .string()
  .trim()
  .regex(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i, 'Must be a valid mailto link.');

const hrefSchema = z.union([httpUrlSchema, internalPathSchema, mailtoSchema]);
const assetPathSchema = z.union([httpUrlSchema, internalPathSchema, dataImageSchema]);
const optionalHrefSchema = z.union([hrefSchema, z.literal('')]).optional().default('');

const navItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: hrefSchema
});

const heroCtaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: hrefSchema,
  icon: z.string().trim().max(60).optional().default(''),
  style: z.enum(['primary', 'outline']).default('outline')
});

const quickNavItemSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(220),
  href: hrefSchema,
  linkText: z.string().trim().min(1).max(80)
});

const socialSchema = z
  .object({
    instagram: optionalHrefSchema,
    facebook: optionalHrefSchema,
    linkedin: optionalHrefSchema,
    youtube: optionalHrefSchema
  })
  .passthrough();

export const siteDocumentSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120),
    domain: httpUrlSchema,
    contactEmail: z.string().trim().email().max(160),
    navigation: z.array(navItemSchema).default([]),
    home: z
      .object({
        heroEyebrow: z.string().trim().min(1).max(120),
        heroHeading: z.string().trim().min(1).max(120),
        heroSubheading: z.string().trim().min(1).max(800),
        heroImage: assetPathSchema,
        heroImageAlt: z.string().trim().min(1).max(180),
        heroDetails: z.array(z.string().trim().min(1).max(120)).default([]),
        proofItems: z.array(z.string().trim().min(1).max(120)).default([]),
        heroCTAs: z.array(heroCtaSchema).default([]),
        quickNav: z.array(quickNavItemSchema).default([]),
        featuredProducts: z.coerce.number().int().min(1).max(12).default(3),
        featuredEvents: z.coerce.number().int().min(1).max(12).default(2),
        featuredPosts: z.coerce.number().int().min(1).max(12).default(2)
      })
      .passthrough(),
    social: socialSchema,
    seo: z
      .object({
        defaultTitle: z.string().trim().min(1).max(180),
        defaultDescription: z.string().trim().min(1).max(240),
        keywords: z.array(z.string().trim().min(1).max(80)).default([])
      })
      .passthrough()
  })
  .passthrough();

const professionalLinkSchema = z.object({
  label: z.string().trim().min(1).max(100),
  href: hrefSchema
});

const speakingTopicSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(320)
});

export const aboutDocumentSchema = z
  .object({
    headline: z.string().trim().min(1).max(140),
    tagline: z.string().trim().min(1).max(120),
    portrait: assetPathSchema,
    location: z.string().trim().min(1).max(120),
    bio: z.array(z.string().trim().min(1).max(1200)).default([]),
    secondaryImage: assetPathSchema,
    secondaryImageAlt: z.string().trim().min(1).max(180),
    currentWork: z.object({
      eyebrow: z.string().trim().min(1).max(120),
      heading: z.string().trim().min(1).max(160),
      description: z.string().trim().min(1).max(1200)
    }),
    editingExperience: z.array(z.string().trim().min(1).max(220)).default([]),
    education: z.array(z.string().trim().min(1).max(220)).default([]),
    professionalLinks: z.array(professionalLinkSchema).default([]),
    speakingTopics: z.array(speakingTopicSchema).default([]),
    cta: z.object({
      heading: z.string().trim().min(1).max(120),
      description: z.string().trim().min(1).max(320),
      linkText: z.string().trim().min(1).max(80),
      linkHref: hrefSchema
    })
  })
  .passthrough();

export const eventsMetaSchema = z.object({
  timezone: z.string().trim().min(1).max(80).default('America/Los_Angeles')
});

const optionalHttpUrlSchema = z.union([httpUrlSchema, z.literal('')]).default('');
const optionalAssetPathSchema = z.union([assetPathSchema, z.literal('')]).default('');
const optionalDateSchema = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).default('');

export const productItemSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(320),
    longDescription: z.string().trim().max(3000).default(''),
    category: z.string().trim().min(1).max(120),
    image: optionalAssetPathSchema,
    imageAlt: z.string().trim().max(180).default(''),
    amazonUrl: optionalHttpUrlSchema,
    tptUrl: optionalHttpUrlSchema,
    featured: z.coerce.boolean().default(false),
    isNew: z.coerce.boolean().default(false),
    publishDate: optionalDateSchema
  })
  .passthrough();

export const productsDocumentSchema = z.object({
  products: z.array(productItemSchema).default([])
});

export const mediaLibraryItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160),
  path: assetPathSchema,
  source: z.string().trim().min(1).max(80)
});

export const mediaLibraryDocumentSchema = z.object({
  items: z.array(mediaLibraryItemSchema).default([])
});

export const legalPageSchema = z.object({
  title: z.string().trim().min(1).max(140),
  intro: z.string().trim().min(1).max(1200),
  body: z.string().trim().min(1).max(12000),
  updatedLabel: z.string().trim().min(1).max(80)
});

export const legalDocumentSchema = z.object({
  privacy: legalPageSchema,
  terms: legalPageSchema
});

export const linkInputSchema = z.object({
  groupName: linkGroupSchema,
  slotKey: z.string().trim().max(80).optional().nullable(),
  label: z.string().trim().min(1).max(100),
  href: hrefSchema,
  icon: z.string().trim().max(60).optional().nullable(),
  style: z.string().trim().max(40).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  visible: z.coerce.boolean().default(true)
});

export const speakingInputSchema = z.object({
  type: z.enum(['upcoming_conference', 'speaking_engagement', 'past_appearance']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  displayDate: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  venue: z.string().trim().max(160).optional().nullable(),
  venueAddress: z.string().trim().max(200).optional().nullable(),
  venueMapUrl: hrefSchema.optional().nullable(),
  talkTitle: z.string().trim().min(1).max(200),
  topic: z.string().trim().max(300).optional().nullable()
});

// ── Block & Page schemas ──

const blockTypes = ['hero', 'text', 'image', 'gallery', 'cards', 'cta', 'divider'] as const;
export type BlockType = (typeof blockTypes)[number];

const heroBlockData = z.object({
  heading: z.string().trim().max(200).default(''),
  subheading: z.string().trim().max(800).default(''),
  image: z.union([assetPathSchema, z.literal('')]).default(''),
  imageAlt: z.string().trim().max(180).default(''),
  buttonText: z.string().trim().max(80).default(''),
  buttonHref: z.union([hrefSchema, z.literal('')]).default('')
});

const textBlockData = z.object({
  heading: z.string().trim().max(200).default(''),
  body: z.string().trim().max(8000).default('')
});

const imageBlockData = z.object({
  src: z.union([assetPathSchema, z.literal('')]).default(''),
  alt: z.string().trim().max(180).default(''),
  caption: z.string().trim().max(300).default(''),
  href: z.union([hrefSchema, z.literal('')]).default('')
});

const galleryImageSchema = z.object({
  src: z.union([assetPathSchema, z.literal('')]).default(''),
  alt: z.string().trim().max(180).default(''),
  caption: z.string().trim().max(300).default('')
});

const galleryBlockData = z.object({
  images: z.array(galleryImageSchema).default([])
});

const cardItemSchema = z.object({
  image: z.union([assetPathSchema, z.literal('')]).default(''),
  title: z.string().trim().max(160).default(''),
  description: z.string().trim().max(400).default(''),
  href: z.union([hrefSchema, z.literal('')]).default('')
});

const cardsBlockData = z.object({
  cards: z.array(cardItemSchema).default([])
});

const ctaBlockData = z.object({
  heading: z.string().trim().max(200).default(''),
  description: z.string().trim().max(600).default(''),
  buttonText: z.string().trim().max(80).default(''),
  buttonHref: z.union([hrefSchema, z.literal('')]).default('')
});

const dividerBlockData = z.object({
  size: z.enum(['small', 'medium', 'large']).default('medium')
});

export const blockDataSchemas = {
  hero: heroBlockData,
  text: textBlockData,
  image: imageBlockData,
  gallery: galleryBlockData,
  cards: cardsBlockData,
  cta: ctaBlockData,
  divider: dividerBlockData
} as const;

export const blockSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.enum(blockTypes),
  data: z.record(z.string(), z.unknown())
});

export const pageInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^\/[a-z0-9][a-z0-9\-/]*$/,
      'The web address needs to start with / and use lowercase letters, numbers, or hyphens (for example, /about or /my-page).'
    ),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(''),
  blocks: z.array(blockSchema).default([]),
  published: z.coerce.boolean().default(false),
  showInNav: z.coerce.boolean().default(false),
  navOrder: z.coerce.number().int().min(0).max(999).default(99)
});

export function validateBlocks(blocks: z.infer<typeof blockSchema>[]) {
  const errors: string[] = [];
  for (const block of blocks) {
    const schema = blockDataSchemas[block.type as BlockType];
    if (!schema) {
      errors.push(`Unknown block type: ${block.type}`);
      continue;
    }
    const result = schema.safeParse(block.data);
    if (!result.success) {
      errors.push(`Block "${block.id}" (${block.type}): ${result.error.issues.map((i) => i.message).join(', ')}`);
    }
  }
  return errors;
}

export const authSettingsInputSchema = z.object({
  email: z.string().trim().email().max(160),
  currentPassword: z.string().min(1).max(256),
  newPassword: z
    .string()
    .max(128)
    .default('')
    .refine((value) => value === '' || value.trim().length >= 12, 'New password must be at least 12 characters.')
});
