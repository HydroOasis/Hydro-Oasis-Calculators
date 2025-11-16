(function(global){
  'use strict';

  const BRAND_URLS = {
    logo: 'https://cdn.shopify.com/s/files/1/0709/5261/6094/files/Hydro_Oasis_Logo.svg?v=1750645434',
    nepenthes: 'https://cdn.shopify.com/s/files/1/0709/5261/6094/files/Nepenthes_Mascot.png?v=1750645317',
    cactus: 'https://cdn.shopify.com/s/files/1/0709/5261/6094/files/Cactus_Mascot.png?v=1750645317'
  };

  const assetCache = {};

  function readBlobAsDataURL(blob){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImageAsset(url){
    if(!url) return Promise.resolve(null);
    if(!assetCache[url]){
      assetCache[url] = fetch(url, { mode: 'cors' })
        .then(resp=>resp.blob())
        .then(readBlobAsDataURL)
        .then(dataUrl=>new Promise(resolve=>{
          const img = new Image();
          img.onload = ()=> resolve({ dataUrl, width: img.naturalWidth || img.width || 1, height: img.naturalHeight || img.height || 1 });
          img.onerror = ()=> resolve({ dataUrl, width: 1, height: 1 });
          img.src = dataUrl;
        }))
        .catch(err=>{ console.warn('[Hydro Oasis] Unable to load branding asset', url, err); return null; });
    }
    return assetCache[url];
  }

  function getHeightFromWidth(asset, width){
    const originalWidth = asset?.width || width || 1;
    const originalHeight = asset?.height || width || 1;
    return width * (originalHeight / originalWidth);
  }

  function getWidthFromHeight(asset, height){
    const originalWidth = asset?.width || height || 1;
    const originalHeight = asset?.height || height || 1;
    return height * (originalWidth / originalHeight);
  }

  function drawBrandHeader(doc, assets, options){
    if(!doc) return options.startY ?? 20;
    const prevFont = typeof doc.getFont === 'function' ? doc.getFont() : null;
    const prevSize = typeof doc.getFontSize === 'function' ? doc.getFontSize() : null;
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = options.startY ?? 12;
    let drewSomething = false;

    if(assets.logo?.dataUrl){
      const logoWidth = options.logoWidth || 44;
      const logoHeight = getHeightFromWidth(assets.logo, logoWidth);
      const x = (pageWidth - logoWidth) / 2;
      doc.addImage(assets.logo.dataUrl, 'PNG', x, cursorY, logoWidth, logoHeight);
      cursorY += logoHeight + (options.logoSpacing ?? 4);
      drewSomething = true;
    }

    const brandTitle = options.brandTitle || 'Hydro Oasis';
    const fontSize = options.brandFontSize || 22;
    const fontName = options.brandFont || 'helvetica';
    if(typeof doc.setFont === 'function'){ doc.setFont(fontName, 'bold'); }
    if(typeof doc.setFontSize === 'function'){ doc.setFontSize(fontSize); }
    const textWidth = doc.getTextWidth ? doc.getTextWidth(brandTitle) : 0;
    const textX = textWidth ? (pageWidth - textWidth) / 2 : pageWidth / 2;
    const scale = doc.internal.scaleFactor || 1;
    const fontHeight = fontSize / scale;
    const baseline = cursorY + fontHeight;
    doc.text(brandTitle, textX, baseline);
    drewSomething = true;

    const textCenterY = baseline - fontHeight / 2;
    const mascotHeight = options.mascotHeight || 18;
    const spacing = options.mascotSpacing || 6;
    const margin = options.mascotMargin || 8;

    if(assets.nepenthes?.dataUrl){
      const width = getWidthFromHeight(assets.nepenthes, mascotHeight);
      const x = Math.max(margin, textX - width - spacing);
      const y = textCenterY - mascotHeight / 2;
      doc.addImage(assets.nepenthes.dataUrl, 'PNG', x, y, width, mascotHeight);
    }

    if(assets.cactus?.dataUrl){
      const width = getWidthFromHeight(assets.cactus, mascotHeight);
      const x = Math.min(pageWidth - width - margin, textX + textWidth + spacing);
      const y = textCenterY - mascotHeight / 2;
      doc.addImage(assets.cactus.dataUrl, 'PNG', x, y, width, mascotHeight);
    }

    if(prevFont && typeof doc.setFont === 'function'){
      doc.setFont(prevFont.fontName || 'helvetica', prevFont.fontStyle || 'normal');
    }
    if(prevSize && typeof doc.setFontSize === 'function'){
      doc.setFontSize(prevSize);
    }

    return drewSomething ? baseline + (options.headerPadding ?? 6) : cursorY;
  }

  function addWatermarkToPage(doc, cactus, options){
    if(!cactus?.dataUrl) return;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const width = options.watermarkWidth || 36;
    const height = getHeightFromWidth(cactus, width);
    const margin = options.watermarkMargin || 14;
    const x = pageWidth - width - margin;
    const y = pageHeight - height - margin;
    let resetOpacity = null;
    if(typeof doc.setGState === 'function' && typeof doc.GState === 'function'){
      try{
        doc.setGState(new doc.GState({ opacity: options.watermarkOpacity ?? 0.12 }));
        resetOpacity = ()=>{ doc.setGState(new doc.GState({ opacity: 1 })); };
      }catch(err){ resetOpacity = null; }
    }
    doc.addImage(cactus.dataUrl, 'PNG', x, y, width, height);
    if(resetOpacity) resetOpacity();
  }

  function patchAddPage(doc, assets, options){
    if(doc.__hoBrandingPatched) return;
    const originalAddPage = doc.addPage.bind(doc);
    doc.addPage = function(...args){
      originalAddPage(...args);
      if(assets.logo || assets.nepenthes || assets.cactus){
        drawBrandHeader(this, assets, options);
      }
      if(assets.cactus){
        addWatermarkToPage(this, assets.cactus, options);
      }
      return this;
    };
    doc.__hoBrandingPatched = true;
  }

  async function decorate(doc, options = {}){
    if(!doc || !doc.internal?.pageSize){
      const start = options.startY ?? 20;
      const gap = options.contentGap ?? 10;
      return { headerBottom: start, contentStart: start + gap };
    }

    const assets = await Promise.all([
      loadImageAsset(BRAND_URLS.logo),
      loadImageAsset(BRAND_URLS.nepenthes),
      loadImageAsset(BRAND_URLS.cactus)
    ]).then(([logo, nepenthes, cactus])=>({ logo, nepenthes, cactus }));

    const headerBottom = drawBrandHeader(doc, assets, options);
    if(assets.cactus){
      addWatermarkToPage(doc, assets.cactus, options);
    }
    patchAddPage(doc, assets, options);

    const gap = options.contentGap ?? 10;
    return {
      assets,
      headerBottom,
      contentStart: (headerBottom ?? (options.startY ?? 20)) + gap
    };
  }

  global.hydroPdfBranding = { decorate };
})(window);
