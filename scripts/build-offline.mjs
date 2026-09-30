import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dist = new URL("../dist/", import.meta.url);
const assets = (await readdir(new URL("assets/", dist))).map(
  (f) => "assets/" + f,
);
const files = [
  "index.html",
  "EXAMPLE_SOURCES.md",
  "data/vocabulary.json",
  "data/conjugations.json",
  ...assets,
];
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(new URL(file, dist)));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  new URL("sw.js", dist),
  `
// Generated per production build. All URLs remain inside the Pages project path.
const PREFIX = 'french-practice-' + self.registration.scope;
const CACHE = PREFIX + ${JSON.stringify(version)};
const FILES = ${JSON.stringify(["./", ...files])};
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached = await cache.match(event.request);
    if(cached)return cached;
    try{return await fetch(event.request);}catch(error){
      if(event.request.mode==='navigate')return await cache.match('index.html');
      throw error;
    }
  }));
});
`,
);
console.log("Prepared versioned offline cache.");
