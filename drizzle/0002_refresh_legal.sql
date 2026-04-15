INSERT INTO content_documents (
  key,
  body,
  created_at,
  updated_at
) VALUES (
  'legal',
  json_object(
    'privacy',
    json_object(
      'title', 'Privacy Policy',
      'intro', 'This website collects limited information needed to publish content, secure admin access, and operate site infrastructure. Public visitors do not create accounts or submit stored forms on this website at this time.',
      'body', '## Information We Collect\nWe collect administrator login information, secure session cookie data, site content management records, and audit logs related to changes made in admin area. We also process basic technical request information needed to serve website through Cloudflare.\n\n## How We Use Information\nWe use this information to authenticate site administrator, protect admin area, publish and update website content, investigate misuse, and keep website available and secure.\n\n## Cookies and Sessions\nAdmin area uses essential authentication cookie after successful sign-in. This cookie is required for access to admin tools and is not used for advertising.\n\n## Third-Party Services and Links\nWebsite is hosted and delivered through Cloudflare. Website may link to third-party destinations such as Amazon, Teachers Pay Teachers, Google Scholar, Instagram, LinkedIn, and other external platforms. Those services control their own privacy practices and content.\n\n## Data Retention\nAdmin session records, audit logs, and managed content records are retained only for as long as reasonably necessary to operate, secure, and maintain website.\n\n## Your Choices\nPublic visitors may choose whether to click outbound links. If you are site administrator and want account credentials changed or removed, use admin access settings or contact site owner directly.\n\n## Changes to This Policy\nThis policy may be updated as site features, hosting, or legal requirements change. Updated version will appear on this page with revised effective date.\n\n## Contact\nFor privacy questions, use contact information listed on Contact page.',
      'updatedLabel', 'April 15, 2026'
    ),
    'terms',
    json_object(
      'title', 'Terms of Use',
      'intro', 'By using this website, you agree to use it lawfully and understand that site content, links, and materials are provided for informational and professional purposes.',
      'body', '## Ownership\nOriginal text, branding, images, teaching materials, and other original website content belong to Ashley Jae Carranza unless otherwise noted. No license to reuse content is granted except where law or written permission allows it.\n\n## Acceptable Use\nDo not misuse website, attempt unauthorized access, interfere with admin area, scrape content in harmful way, or use automated tools that degrade service or security.\n\n## Accuracy and Availability\nWebsite content may change over time. We try to keep information accurate, but we do not guarantee completeness, continuous availability, or error-free operation.\n\n## Third-Party Links\nWebsite may link to external services, marketplaces, publications, or social platforms. We are not responsible for third-party content, availability, transactions, or policies.\n\n## No Warranty\nWebsite is provided as-is and as-available to extent permitted by law, without warranties of any kind.\n\n## Limitation of Liability\nTo extent permitted by law, site owner is not liable for damages, losses, or claims arising from use of website or reliance on linked third-party services.\n\n## Changes to Terms\nThese terms may be updated from time to time. Continued use of website after changes means you accept revised terms.\n\n## Contact\nQuestions about these terms may be directed through contact information listed on Contact page.',
      'updatedLabel', 'April 15, 2026'
    )
  ),
  COALESCE((SELECT created_at FROM content_documents WHERE key = 'legal'), CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  body = excluded.body,
  updated_at = excluded.updated_at;
