import { legalDocumentSchema } from '../validation';

export const defaultLegalDocument = legalDocumentSchema.parse({
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This website collects limited information needed to run a secure admin area, understand aggregate website traffic, and maintain the site. Public visitors do not create accounts on this website.',
    body:
      '## Information We Collect\nWe collect an administrator email for sign-in, secure session cookie data, and audit records of admin content changes. We may also collect aggregate traffic information through Cloudflare analytics tools.\n\n## How We Use Information\nWe use this information to authenticate the site administrator, secure the admin area, publish site updates, and understand how the website is being used at a high level.\n\n## Cookies and Sessions\nThe admin area uses an essential session cookie after a successful login. This cookie is required for authentication and cannot be disabled if you want to access the admin area.\n\n## Third-Party Services\nThis website is hosted on Cloudflare infrastructure. Outbound links may take you to third-party websites such as Amazon, Teachers Pay Teachers, Google Scholar, or social networks. Those services have their own privacy practices.\n\n## Retention\nAdmin audit logs and session records are retained only as long as reasonably necessary to operate and secure the site.\n\n## Contact\nFor privacy questions, contact the site owner at the email listed on the Contact page.',
    updatedLabel: 'April 14, 2026'
  },
  terms: {
    title: 'Terms of Use',
    intro:
      'By using this website, you agree to use it lawfully and understand that content, features, and external links are provided for informational purposes.',
    body:
      '## Ownership\nAll original website content, unless otherwise noted, belongs to Ashley Jae Carranza and may not be reproduced without permission.\n\n## Acceptable Use\nDo not misuse the site, attempt unauthorized access, interfere with the admin area, or use automated tools in a way that harms site availability.\n\n## Third-Party Links\nThis site links to third-party platforms and publications. We are not responsible for third-party content, policies, or availability.\n\n## No Warranty\nThis website is provided as-is without warranties of any kind to the extent permitted by law.\n\n## Limitation of Liability\nTo the extent permitted by law, the site owner is not liable for damages arising from use of this website or linked services.\n\n## Changes\nThese terms may be updated over time. Continued use of the website after updates means you accept the revised terms.',
    updatedLabel: 'April 14, 2026'
  }
});

