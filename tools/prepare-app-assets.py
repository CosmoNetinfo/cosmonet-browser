"""Copy reviewed static brand/model assets and generate a self-contained home page."""
import base64
from pathlib import Path
import shutil

root=Path(__file__).resolve().parents[1]
app=root/"app"
app.mkdir(exist_ok=True)
vendor=app/"vendor"
vendor.mkdir(exist_ok=True)
eruda=root/"node_modules/eruda/eruda.js"
if not eruda.exists():
    raise RuntimeError("Esegui npm ci --ignore-scripts prima di preparare l'app.")
shutil.copyfile(eruda,vendor/"eruda.js")
shutil.copyfile(root/"extensions/cosmo-home/model.mjs",app/"model.mjs")
shutil.copyfile(root/"branding/icons/cosmo-browser-128.png",app/"logo.png")
shutil.copyfile(root/"favicon.png",app/"favicon.png")
for source,target in [("cosmo-browser-32.png","32x32.png"),("cosmo-browser-128.png","128x128.png"),("cosmo-browser-256.png","128x128@2x.png"),("cosmo-browser.ico","icon.ico")]:
    shutil.copyfile(root/"branding/icons"/source,root/"src-tauri/icons"/target)
logo=base64.b64encode((app/"logo.png").read_bytes()).decode()
html='''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuova scheda · Cosmo Browser</title><style>
:root{font-family:system-ui,sans-serif;background:#f6f7fb;color:#202735;color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center}main{width:min(680px,88vw);padding:50px 0}img{width:64px;height:64px}p{color:#65708a;font-size:13px}h1{font-size:clamp(32px,6vw,52px);font-weight:500;letter-spacing:-.05em;margin:24px 0}form{display:flex;gap:8px;margin:32px 0}input{flex:1;min-width:0;padding:16px;border:1px solid #dce0e8;border-radius:8px;font:inherit}button{padding:12px 20px;border:0;background:#4358b5;color:white;border-radius:8px;font:inherit}a{display:inline-block;color:inherit;border:1px solid #dce0e8;border-radius:7px;padding:12px 20px;text-decoration:none}@media(prefers-color-scheme:dark){:root{background:#171d2b;color:#edf0fa;color-scheme:dark}input{background:#222b3d;color:#edf0fa;border-color:#354159}p{color:#a7b2ca}a{border-color:#354159}}</style></head><body><main><img src="data:image/png;base64,LOGO" alt="Cosmo Browser"><p>COSMONET · IL TUO SPAZIO SUL WEB</p><h1>Da dove partiamo?</h1><form action="https://duckduckgo.com/" method="get"><input name="q" type="search" aria-label="Cerca sul web" placeholder="Cerca sul web" autocomplete="off"><button type="submit">Cerca</button></form><a href="https://www.cosmonet.info/">Apri CosmoNet ↗</a><p>Ricerca con DuckDuckGo. Preferenze e credenziali restano sul dispositivo.</p></main></body></html>'''
html=html.replace('</style>', ':root[data-theme=dark]{background:#171d2b;color:#edf0fa;color-scheme:dark}:root[data-theme=dark] input{background:#222b3d;color:#edf0fa;border-color:#354159}:root[data-theme=light]{background:#f6f7fb;color:#202735;color-scheme:light}:root[data-theme=light] input{background:white;color:#202735}:root[data-theme=sand]{background:#f2ecdf;color:#3d3428;color-scheme:light}</style>')
html=html.replace('</style>', '@media(max-width:600px){body{display:block;min-height:100dvh}main{width:auto;margin:0;padding:40px 24px}img{width:56px;height:56px}h1{font-size:36px;margin:24px 0;line-height:1.15}form{margin:28px 0;gap:8px}input{font-size:16px;padding:14px 12px;width:0}button{min-height:48px;padding:12px 16px}a{min-height:48px}p{font-size:14px;line-height:1.6}}</style>')
(app/"home.html").write_text(html.replace('base64,LOGO','base64,'+logo),encoding="utf-8")
print("Prepared native UI, self-contained home page and app icons.")
