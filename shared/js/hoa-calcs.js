// /shared/js/hoa-calcs.js
// Shared utilities for all Hydro Oasis calculators
const HOA = (() => {
  const DATA = {
    waterProviders: '../../data/water_providers.json',
    elecTariffs:    '../../data/electricity_tariffs.json',
    nutrientPresets:'../../data/nutrient_presets.json',
    recVent:        '../../Recommendations/ventilation.md',
    recDehum:       '../../Recommendations/dehumidification.md'
  };

  async function fetchJSON(path){
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return res.json();
  }

  async function fetchText(path){
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return res.text();
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
