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

const mailtoSchema = z
  .string()
  .trim()
  .regex(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i, 'Must be a valid mailto link.');

const hrefSchema = z.union([httpUrlSchema, internalPathSchema, mailtoSchema]);
const assetPathSchema = z.union([httpUrlSchema, internalPathSchema]);
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

export const authSettingsInputSchema = z.object({
  email: z.string().trim().email().max(160),
  currentPassword: z.string().min(1).max(256),
  newPassword: z
    .string()
    .max(128)
    .default('')
    .refine((value) => value === '' || value.trim().length >= 12, 'New password must be at least 12 characters.')
});
