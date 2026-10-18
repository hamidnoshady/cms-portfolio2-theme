/* ===========================================================================
   Mosaic — the index of work
   =========================================================================== */

export class Mosaic {
  constructor({ root, projects = [], onSelect }) {
    this.root = root;
    this.projects = projects;
    this.onSelect = onSelect;
    this.tiles = [];
    this.currentIndex = -1;
  }

  render() {
    this.root.replaceChildren(
      ...this.projects.map((project, index) => this.renderTile(project, index)),
    );
    this.tiles = Array.from(this.root.querySelectorAll('.tile'));
  }

  renderTile(project, index) {
    const tile = document.createElement('a');
    tile.className = 'tile';
    tile.href = `#/p/${project.id}`;
    tile.dataset.span = String(project.span ?? 6);
    tile.dataset.index = String(index);
    tile.setAttribute('aria-label', `Open ${project.title}`);

    const art = document.createElement('span');
    art.className = 'tile__art';
    const image = document.createElement('img');
    image.src = project.art;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    art.append(image);

    const top = document.createElement('span');
    top.className = 'tile__top';
    const indexEl = document.createElement('span');
    indexEl.className = 'tile__index';
    indexEl.textContent = String(index + 1).padStart(2, '0');
    const kind = document.createElement('span');
    kind.textContent = project.kicker;
    top.append(indexEl, kind);

    const title = document.createElement('span');
    title.className = 'tile__title';
    title.textContent = project.title;

    const foot = document.createElement('span');
    foot.className = 'tile__foot';
    const year = document.createElement('span');
    year.textContent = project.year;
    const role = document.createElement('span');
    role.textContent = project.role;
    foot.append(year, role);

    tile.append(art, top, title, foot);

    tile.addEventListener('click', (event) => {
      event.preventDefault();
      this.onSelect?.(index);
    });

    return tile;
  }

  /** Mark the tile that owns the open project. */
  setCurrent(index) {
    this.currentIndex = index;
    this.tiles.forEach((tile, i) => {
      tile.classList.toggle('is-current', i === index);
    });
  }

  getTileRect(index) {
    const tile = this.tiles[index];
    if (!tile) return null;
    return tile.getBoundingClientRect();
  }

  /** Give the focus back to the tile the reader came from — without moving
      the page underneath them. */
  focusTile(index) {
    const tile = this.tiles[index];
    if (!tile) return;
    tile.focus({ preventScroll: true });
  }
}
