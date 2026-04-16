/**
 * WIPModal - "Work in Progress" modal for unimplemented features.
 * Standalone UI component following the plugin pattern.
 */
export class WIPModal {
  constructor(container) {
    this.container = container;
    this.overlay = null;
    this.boundClose = this.close.bind(this);
    this.create();
  }

  create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'mv-wip-overlay mv-hidden';
    this.overlay.innerHTML = `
      <div class="mv-wip-modal">
        <div class="mv-wip-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h3 class="mv-wip-title"></h3>
        <p class="mv-wip-message">This feature is currently under development.</p>
        <button class="mv-wip-close-btn">OK</button>
      </div>
    `;

    const modelViewer = this.container.querySelector('.model-viewer') || this.container;
    modelViewer.appendChild(this.overlay);

    this.overlay.querySelector('.mv-wip-close-btn').addEventListener('click', this.boundClose);
  }

  show(featureName) {
    this.overlay.querySelector('.mv-wip-title').textContent = featureName;
    this.overlay.classList.remove('mv-hidden');
  }

  close() {
    this.overlay.classList.add('mv-hidden');
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
