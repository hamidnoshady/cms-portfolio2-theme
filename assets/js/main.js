/* ===========================================================================
   Main — wiring
   =========================================================================== */

import { loadProjects } from './data.js';
import { Mosaic } from './mosaic.js';
import { ProjectView } from './project-view.js';

const mosaicRoot = document.querySelector('[data-mosaic]');
const projectRoot = document.querySelector('[data-project]');

function fillSiteMeta(site, projects) {
  const name = document.querySelector('[data-site-name]');
  const descriptor = document.querySelector('[data-site-descriptor]');
  const count = document.querySelector('[data-site-count]');

  if (name && site.name) name.textContent = site.name;
  if (descriptor && site.descriptor) descriptor.textContent = site.descriptor;
  if (count) count.textContent = site.count ?? `${projects.length} projects`;
}

function projectIndexFromHash(projects) {
  const match = window.location.hash.match(/^#\/p\/(.+)$/);
  if (!match) return -1;
  return projects.findIndex((project) => project.id === match[1]);
}

async function boot() {
  const { site, projects } = await loadProjects();
  fillSiteMeta(site, projects);

  const mosaic = new Mosaic({
    root: mosaicRoot,
    projects,
    onSelect: (index) => view.open(index),
  });
  mosaic.render();

  const view = new ProjectView({
    root: projectRoot,
    projects,
    onOpen: (index) => {
      mosaic.setCurrent(index);
    },
    onClose: (index) => {
      mosaic.setCurrent(-1);
      // Give the focus back to the tile the reader came from and put the
      // address bar back the way it was.
      mosaic.focusTile(index);
      if (window.location.hash.startsWith('#/p/')) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        );
      }
    },
    onChange: (index) => mosaic.setCurrent(index),
    getTileRect: (index) => mosaic.getTileRect(index),
  });

  // Deep link: /#p/<id> opens straight into a project.
  const index = projectIndexFromHash(projects);
  if (index >= 0) view.open(index);

  // Expose a tiny handle for the verification script.
  window.__theme = { view, mosaic, projects };
}

boot().catch((error) => {
  console.error('[theme] failed to start', error);
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML =
      '<p style="padding:40px 0">The project archive could not be loaded. Run <code>npm run dev</code> and open the preview again.</p>';
  }
});
