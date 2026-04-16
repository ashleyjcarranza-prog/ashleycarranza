export const STRINGS = {
  page: {
    titleLabel: 'Page title',
    titlePlaceholder: 'For example: About Me',
    slugLabel: 'Web address',
    slugHelper: 'This is the link people visit. Lowercase letters, numbers, and hyphens only. Example: /about',
    slugPlaceholder: '/about',
    descriptionLabel: 'Short description',
    descriptionHelper: 'Shows up when people share this page or see it in search results.',
    descriptionPlaceholder: 'A one-sentence summary for this page.',
    publishedLabel: 'Is this page live?',
    publishedOnTitle: 'Published',
    publishedOnNote: 'Anyone visiting the site can see this page.',
    publishedOffTitle: 'Draft',
    publishedOffNote: 'Only you can see this page while you work on it.',
    showInNavLabel: 'Show in the top menu?',
    showInNavYes: 'Yes — add to the menu',
    showInNavNo: 'No — keep it hidden',
    navOrderLabel: 'Where should it sit in the menu?',
    navOrderHelper: 'Lower numbers appear first. Leave at 99 if you are not sure.',
    moreOptionsLabel: 'Page details (address, description, menu)',
    savePage: 'Save changes',
    createPage: 'Create this page',
    deletePage: 'Delete this page',
    viewLive: 'View live',
    viewDraft: 'Preview draft'
  },
  blocks: {
    emptyCanvas: 'This page is empty. Add your first section below.',
    addSection: 'Add a section',
    insertAbove: 'Insert above',
    insertBelow: 'Insert below',
    duplicate: 'Duplicate',
    remove: 'Remove',
    move: 'Move',
    selectHint: 'Click a section to edit it.',
    placeholders: {
      heroHeading: 'Add your big headline here',
      heroSubheading: 'Write a short sentence that explains what you do.',
      heroButton: 'Button text',
      textHeading: 'Optional heading',
      textBody: 'Click here to write your story…',
      ctaHeading: 'Your call to action',
      ctaDescription: 'Tell people why they should reach out or buy.',
      ctaButton: 'Button text',
      imageCaption: 'Optional caption',
      galleryEmpty: 'No images yet — click “Add image” below to add the first one.',
      cardsEmpty: 'No cards yet — click “Add card” below to add the first one.',
      cardTitle: 'Card title',
      cardDescription: 'A short description for this card.'
    }
  },
  fields: {
    heading: 'Headline',
    subheading: 'Short intro below the headline',
    heroImage: 'Background photo',
    imageAlt: 'Describe this image (for screen readers and SEO)',
    buttonText: 'Button label',
    buttonHref: 'Where the button goes (a link or page)',
    body: 'Paragraphs',
    bodyHelper: 'Leave a blank line between paragraphs.',
    src: 'Image',
    alt: 'Describe this image',
    caption: 'Caption (optional)',
    href: 'Link (optional) — where to go when clicked',
    galleryImages: 'Images in this gallery',
    cards: 'Cards in this section',
    cardImage: 'Card image',
    cardTitle: 'Title',
    cardDescription: 'Short description',
    cardHref: 'Link — where the card goes',
    ctaHeading: 'Big headline',
    ctaDescription: 'Supporting sentence',
    dividerSize: 'How much empty space?'
  },
  status: {
    saving: 'Saving…',
    savedNow: 'Saved just now',
    savedAgo: (secs) => {
      if (secs < 5) return 'Saved just now';
      if (secs < 60) return `Saved ${Math.round(secs)}s ago`;
      if (secs < 3600) return `Saved ${Math.round(secs / 60)}m ago`;
      return `Saved ${Math.round(secs / 3600)}h ago`;
    },
    offline: 'Offline — we’ll save when the connection comes back',
    conflict: 'This page was changed in another tab. Reload to see the latest version.',
    unsaved: 'Unsaved changes',
    error: (msg) => `We couldn’t save: ${msg || 'unknown problem'}. We’ll keep retrying.`,
    undo: (desc) => `Undone${desc ? `: ${desc}` : ''}`,
    redo: (desc) => `Redone${desc ? `: ${desc}` : ''}`
  },
  empty: {
    loading: 'Loading your editor…',
    noPages: 'You haven’t created any custom pages yet. Use “+ New Page” on the left.'
  },
  blockTypes: {
    hero: {
      label: 'Big Hero',
      description: 'A large headline with a photo and a button. Great for the top of a page.'
    },
    text: {
      label: 'Text',
      description: 'A block of paragraphs, with an optional heading.'
    },
    image: {
      label: 'Single Image',
      description: 'One photo with an optional caption and link.'
    },
    gallery: {
      label: 'Photo Gallery',
      description: 'A grid of photos, side by side.'
    },
    cards: {
      label: 'Cards',
      description: 'A row of clickable cards, each with a photo and description.'
    },
    cta: {
      label: 'Call-to-Action',
      description: 'A centered section with a message and a button that tells people what to do next.'
    },
    divider: {
      label: 'Space',
      description: 'A thin divider line with some empty space around it.'
    }
  }
};
