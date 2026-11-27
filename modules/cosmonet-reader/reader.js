(() => {
  if (!['https://www.cosmonet.info', 'https://cosmonet.info'].includes(location.origin) || window !== top) return;
  const existing = document.getElementById('cosmo-reader-style');
  if (existing) { existing.remove(); return; }
  const style = document.createElement('style');
  style.id = 'cosmo-reader-style';
  style.textContent = 'body{background:#faf8f3!important;color:#222!important}article,.entry-content{max-width:760px!important;margin-inline:auto!important;font:20px/1.75 Georgia,serif!important;padding:24px!important}article img,.entry-content img{max-width:100%!important;height:auto!important}';
  document.head.append(style);
})();
