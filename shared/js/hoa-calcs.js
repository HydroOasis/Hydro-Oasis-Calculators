// /shared/js/hoa-calcs.js
// Shared utilities for all Hydro Oasis calculators
const HOA = (() => {
  const isPreview = /github\.io|raw\.githubusercontent\.com|htmlpreview/i.test(location.href);
  const PREVIEW_BASES = [
    'https://raw.githubusercontent.com/HydroOasis/Hydro-Oasis-Calculators/main/',
    'https://cdn.jsdelivr.net/gh/HydroOasis/Hydro-Oasis-Calculators@main/',
    'https://rawcdn.githack.com/HydroOasis/Hydro-Oasis-Calculators/main/'
  ];

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

  async function fetchJSON(path){
    if (!isPreview) {
      return tryFetchJSON([path]);
    }
    const repoPath = toRepoPath(path);
    const targets = PREVIEW_BASES.map(base => base + repoPath);
    return tryFetchJSON(targets);
  }

  async function fetchText(path){
    if (!isPreview) {
      return tryFetchText([path]);
    }
    const repoPath = toRepoPath(path);
    const targets = PREVIEW_BASES.map(base => base + repoPath);
    return tryFetchText(targets);
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
    DATA, fetchJSON, fetchText, mdToHtml,
    pushToHarvest, getHarvestPayloads
  };
})();
