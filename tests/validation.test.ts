import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aboutDocumentSchema, authSettingsInputSchema, legalDocumentSchema, linkInputSchema, siteDocumentSchema, speakingInputSchema } from '../src/lib/validation';
import { defaultLegalDocument } from '../src/lib/content/legal';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('content validation', () => {
  it('accepts the current site and about data', () => {
    const site = JSON.parse(readFileSync(resolve(rootDir, 'public/data/site.json'), 'utf8'));
    const about = JSON.parse(readFileSync(resolve(rootDir, 'public/data/about.json'), 'utf8'));

    expect(() => siteDocumentSchema.parse(site)).not.toThrow();
    expect(() => aboutDocumentSchema.parse(about)).not.toThrow();
  });

  it('accepts the default legal document', () => {
    expect(() => legalDocumentSchema.parse(defaultLegalDocument)).not.toThrow();
  });

  it('rejects invalid link targets', () => {
    const result = linkInputSchema.safeParse({
      groupName: 'hero_cta',
      label: 'Broken',
      href: 'not-a-link',
      sortOrder: 0,
      visible: true
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid speaking items', () => {
    const result = speakingInputSchema.safeParse({
      type: 'speaking_engagement',
      date: '2026-04-14',
      displayDate: 'April 14, 2026',
      city: 'Las Vegas, NV',
      venue: 'Conference Center',
      venueAddress: '123 Main St',
      venueMapUrl: 'https://maps.google.com/?q=Las+Vegas+NV',
      talkTitle: 'Test Talk',
      topic: 'Writing and teaching'
    });

    expect(result.success).toBe(true);
  });

  it('accepts auth settings with optional password change', () => {
    const result = authSettingsInputSchema.safeParse({
      email: 'ashleyjcarranza@gmail.com',
      currentPassword: 'current-password',
      newPassword: 'AshleyAdmin!2026Reset'
    });

    expect(result.success).toBe(true);
  });
});
