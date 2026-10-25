import { mountStrataSettings, createFetchTransport } from './settings.mjs';

const params = new URLSearchParams(location.search);
await mountStrataSettings(document.querySelector('#app'), {
  request: createFetchTransport('/api/strata'),
  cwd: document.querySelector('meta[name="strata-cwd"]')?.content || undefined,
  theme: ['light', 'dark'].includes(params.get('theme')) ? params.get('theme') : 'auto',
});
