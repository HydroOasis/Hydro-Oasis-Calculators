// /shared/js/hoa-calcs.js
// Shared utilities for all Hydro Oasis calculators
const HOA = (() => {
  const isPreview = /github\.io|raw\.githubusercontent\.com|htmlpreview/i.test(location.href);

  const DEFAULT_CONTEXT = Object.freeze({
    owner: 'HydroOasis',
    repo: 'Hydro-Oasis-Calculators',
    branch: 'main'
  });

  function parsePreviewContext(){
    if (!isPreview) return DEFAULT_CONTEXT;
    if (window.__HOA_PREVIEW_CTX__) return window.__HOA_PREVIEW_CTX__;
    try {
      let href = String(location.href);
      const queryMatch = href.match(/\?(https?:\/\/[^\s]+)$/);
      if (queryMatch) {
        href = queryMatch[1];
      }
      href = decodeURIComponent(href);
      const match = href.match(/https?:\/\/[^/]*github(?:usercontent)?\.com\/([^/]+)\/([^/]+)\/(.+)$/i);
      if (!match) return DEFAULT_CONTEXT;
      const owner = match[1];
      const repo = match[2];
      let remainder = match[3].split(/[?#]/)[0];
      let segments = remainder.split('/').filter(Boolean);

      if (segments[0] === 'blob' || segments[0] === 'raw' || segments[0] === 'tree') {
        segments = segments.slice(1);
      }
      if (segments[0] === 'refs' && segments[1] === 'heads') {
        segments = segments.slice(2);
      }

      const markers = ['Calculators','assets','shared','data','Recommendations','build','dist','public','src','docs','.github'];
      let branchEnd = segments.length;
      for (let i = 0; i < segments.length; i++) {
        if (markers.indexOf(segments[i]) !== -1) {
          branchEnd = i;
          break;
        }
      }
      let branchParts = segments.slice(0, branchEnd);
      if (!branchParts.length && segments.length) {
        branchParts = [segments[0]];
      }
      const branch = branchParts.join('/') || DEFAULT_CONTEXT.branch;
      return window.__HOA_PREVIEW_CTX__ = { owner, repo, branch };
    } catch(err) {
      console.warn('HOA preview context detection failed', err);
      return DEFAULT_CONTEXT;
    }
  }

  function computePreviewBases(context){
    const ctx = context || parsePreviewContext();
    if (window.__HOA_PREVIEW_BASES__ && Array.isArray(window.__HOA_PREVIEW_BASES__) && window.__HOA_PREVIEW_BASES__.length) {
      return window.__HOA_PREVIEW_BASES__;
    }
    const bases = [
      `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${ctx.branch}/`
    ];
    if (ctx.branch.indexOf('/') === -1) {
      bases.push(`https://cdn.jsdelivr.net/gh/${ctx.owner}/${ctx.repo}@${ctx.branch}/`);
    }
    bases.push(`https://rawcdn.githack.com/${ctx.owner}/${ctx.repo}/${ctx.branch}/`);
    const unique = Array.from(new Set(bases));
    return window.__HOA_PREVIEW_BASES__ = unique;
  }

  const PREVIEW_CONTEXT = parsePreviewContext();
  const PREVIEW_BASES = isPreview ? computePreviewBases(PREVIEW_CONTEXT) : [];

  const DATA = {
    waterProviders: '../../data/water_providers.json',
    elecTariffs:    '../../data/electricity_tariffs.json',
    nutrientPresets:'../../data/nutrient_presets.json',
    recVent:        '../../Recommendations/ventilation.md',
    recDehum:       '../../Recommendations/dehumidification.md'
  };

  function toRepoPath(path){
    return path.replace(/^\/+/, '').replace(/^(\.\.\/)+/, '');
  }

  async function tryFetchJSON(targets){
    let lastErr;
    for (const target of targets){
      try {
        const res = await fetch(target, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${target}`);
        return await res.json();
      } catch(err){
        lastErr = err;
      }
    }
    throw lastErr || new Error('Unable to fetch JSON');
  }

  async function tryFetchText(targets){
    let lastErr;
    for (const target of targets){
      try {
        const res = await fetch(target, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${target}`);
        return await res.text();
      } catch(err){
        lastErr = err;
      }
    }
    throw lastErr || new Error('Unable to fetch text');
  }

  function buildFetchTargets(path){
    const targets = [];
    if (!isPreview) {
      targets.push(path);
      return targets;
    }
    const repoPath = toRepoPath(path);
    PREVIEW_BASES.forEach(base => {
      targets.push(base + repoPath);
    });
    targets.push(path);
    return targets;
  }

  async function fetchJSON(path){
    return tryFetchJSON(buildFetchTargets(path));
  }

  async function fetchText(path){
    return tryFetchText(buildFetchTargets(path));
  }

  // Tiny markdown → HTML (headings, bullets, links)
  function mdToHtml(md){
    const esc = s => s.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
    return esc(md)
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)(?!\s*<li>)/gms, '<ul>$1</ul>')
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n{2,}/g, '<br/>');
  }

  // —— Cross-calc data handoff → Harvest via localStorage ——
  const HARVEST_KEY = 'hoa.harvest.payloads.v1';

  function pushToHarvest(payload){
    try{
      const arr = JSON.parse(localStorage.getItem(HARVEST_KEY) || '[]');
      arr.unshift(payload);
      localStorage.setItem(HARVEST_KEY, JSON.stringify(arr.slice(0, 25)));
      window.dispatchEvent(new CustomEvent('hoa-harvest-updated'));
    }catch(e){ console.warn('pushToHarvest error', e); }
  }

  function getHarvestPayloads(){
    try{ return JSON.parse(localStorage.getItem(HARVEST_KEY) || '[]'); }
    catch{ return []; }
  }

  return {
    DATA,
    fetchJSON,
    fetchText,
    mdToHtml,
    pushToHarvest,
    getHarvestPayloads,
    buildFetchTargets,
    previewContext: PREVIEW_CONTEXT,
    previewBases: PREVIEW_BASES.slice ? PREVIEW_BASES.slice() : []
  };
})();
