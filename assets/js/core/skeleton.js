function skeletonLine(width = '100%', height = '1rem') {
  return `<div class="skeleton-line" style="width:${width};height:${height}"></div>`;
}

function skeletonBlock(height = '180px') {
  return `<div class="skeleton-img" style="height:${height}"></div>`;
}

const templates = {
  product(index) {
    return `
      <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
        <div class="card-item p-3 h-100 skeleton-card">
          ${skeletonBlock('200px')}
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2 mt-3">
            ${skeletonLine('60%', '1.2rem')}
            ${skeletonLine('20%', '1.2rem')}
          </div>
          ${skeletonLine('100%')}
          ${skeletonLine('80%')}
          <div class="d-flex gap-2 mt-3">
            ${skeletonLine('100px', '2rem')}
          </div>
        </div>
      </div>`;
  },

  'product-preview'(index) {
    return `
      <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
        <div class="card-item preview-card p-3 h-100 skeleton-card">
          ${skeletonBlock('180px')}
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2 mt-3">
            ${skeletonLine('60%', '1.2rem')}
            ${skeletonLine('20%', '1.2rem')}
          </div>
          ${skeletonLine('100%')}
          ${skeletonLine('70%')}
        </div>
      </div>`;
  },

  event(index) {
    return `
      <div class="col-lg-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
        <div class="card-item p-3 h-100 skeleton-card">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            ${skeletonLine('55%', '1.2rem')}
            ${skeletonLine('25%', '1.2rem')}
          </div>
          ${skeletonLine('40%')}
          ${skeletonLine('50%')}
          ${skeletonLine('35%')}
          <div class="d-flex gap-2 mt-3">
            ${skeletonLine('90px', '2rem')}
            ${skeletonLine('110px', '2rem')}
          </div>
        </div>
      </div>`;
  },

  'event-preview'(index) {
    return `
      <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
        <div class="card-item p-3 h-100 skeleton-card">
          ${skeletonLine('35%')}
          ${skeletonLine('60%', '1.2rem')}
          ${skeletonLine('50%')}
        </div>
      </div>`;
  },

  post(index) {
    return `
      <div class="col-md-6 col-xl-4" data-aos="fade-up" data-aos-delay="${Math.min(index * 60, 240)}">
        <div class="card-item p-3 h-100 skeleton-card">
          ${skeletonLine('30%')}
          ${skeletonLine('80%', '1.2rem')}
          ${skeletonLine('100%')}
          ${skeletonLine('90%')}
          ${skeletonLine('40%', '0.85rem')}
        </div>
      </div>`;
  },

  'post-preview'(index) {
    return `
      <div class="col-md-6" data-aos="fade-up" data-aos-delay="${Math.min(index * 70, 140)}">
        <div class="card-item p-3 h-100 skeleton-card">
          ${skeletonLine('30%')}
          ${skeletonLine('75%', '1.2rem')}
          ${skeletonLine('100%')}
          ${skeletonLine('60%')}
        </div>
      </div>`;
  },

  testimonial() {
    return `
      <div class="skeleton-card testimonial-skeleton p-4">
        ${skeletonLine('100%', '1.4rem')}
        ${skeletonLine('100%', '1.4rem')}
        ${skeletonLine('70%', '1.4rem')}
        <div class="mt-3">
          ${skeletonLine('40%')}
          ${skeletonLine('30%', '0.85rem')}
        </div>
      </div>`;
  }
};

export function renderSkeleton(type, count = 2) {
  const builder = templates[type];
  if (!builder) return '';
  return Array.from({ length: count }, (_, i) => builder(i)).join('');
}
