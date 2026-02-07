const state = {
  categories: [],
  resources: [],
  guides: [],
};

function $(sel){ return document.querySelector(sel); }
function esc(s){ return (s ?? "").toString().replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
}[c]));}

async function loadData(){
  const [cats, res, guides] = await Promise.all([
    fetch("./data/categories.json").then(r=>r.json()),
    fetch("./data/resources.json").then(r=>r.json()),
    fetch("./data/guides.json").then(r=>r.json()),
  ]);
  state.categories = cats;
  state.resources = res;
  state.guides = guides;
}

function setBuildInfo(){
  const el = $("#buildInfo");
  if (!el) return;
  el.textContent = `Build: ${new Date().toISOString().slice(0,10)}`;
}

function route(){
  const hash = location.hash || "#/";
  const [path, query] = hash.slice(2).split("?");
  const parts = path.split("/").filter(Boolean);

  const app = $("#app");
  app.innerHTML = "";

  if (parts.length === 0) return renderHome(app);
  if (parts[0] === "categories") return renderCategories(app);
  if (parts[0] === "category" && parts[1]) return renderCategory(app, parts[1]);
  if (parts[0] === "resources") return renderResources(app);
  if (parts[0] === "guides") return renderGuides(app);
  if (parts[0] === "guide" && parts[1]) return renderGuide(app, parts[1]);
  if (parts[0] === "crisis") return renderCrisis(app);
  if (parts[0] === "offline") return renderOffline(app);
  if (parts[0] === "disclaimer") return renderDisclaimer(app);

  renderNotFound(app);
}

function card(title, subtitle, bodyHtml){
  return `
    <section class="card">
      ${subtitle ? `<div class="kicker">${esc(subtitle)}</div>` : ``}
      <div class="h2">${esc(title)}</div>
      ${bodyHtml || ``}
    </section>
  `;
}
function getModeFromHash(){
  const hash = location.hash || "#/";
  const q = (hash.split("?")[1] || "");
  const params = new URLSearchParams(q);
  return params.get("mode"); // "tonight" | "safety" | null
}

function wireQuickFilters(){
  const tonightBtn = document.getElementById("filter-tonight");
  const safetyBtn = document.getElementById("filter-safety");

  tonightBtn?.addEventListener("click", () => {
    location.hash = "#/resources?mode=tonight";
  });

  safetyBtn?.addEventListener("click", () => {
    location.hash = "#/resources?mode=safety";
  });
}

/* ----------------- Pages ----------------- */
function renderHome(app){
  app.innerHTML = `
    ${card("Start here (fast)", "Low data • large buttons • educational only", `
      <div class="grid">
        <a class="btn btn--danger" href="#/crisis">Crisis & Safety (988)</a>
        <a class="btn btn--primary" href="#/guide/tonight-plan">Tonight Plan</a>
        <a class="btn btn--primary" href="#/category/food-today">Food Today</a>
        <a class="btn btn--primary" href="#/category/shelter">Shelter & Safe Sleep</a>
        <a class="btn btn--primary" href="#/category/id-docs">ID & Documents</a>
        <a class="btn btn--primary" href="#/category/jobs-income">Jobs & Income</a>
      </div>

      <div class="pills" aria-label="Quick tags">
        <button class="pill" id="filter-tonight" type="button">Tonight</button>
        <button class="pill pill--warn" id="filter-safety" type="button">Safety-first</button>
        <span class="pill pill--muted">Santa Rosa + Escambia</span>
      </div>

      <hr />

      <div class="small">
        This site links to trusted resource directories (like 211 and findhelp) and provides basic how-to guides.
        Always confirm details with providers.
      </div>
    `)}

    ${card("Browse categories", "Find what you need", `
      <div class="grid">
        ${state.categories.slice(0,6).map(c => `
          <a class="btn" href="#/category/${esc(c.id)}">${esc(c.title)}</a>
        `).join("")}
      </div>
      <div style="margin-top:10px">
        <a class="btn btn--ghost" href="#/categories">See all categories</a>
      </div>
    `)}

    ${card("Most used guides", "Short, step-by-step", `
      <div class="list">
        ${state.guides.slice(0,5).map(g => `
          <div class="item">
            <div class="item__title">${esc(g.title)}</div>
            <div class="item__meta">${esc(g.readTime)} • ${esc(g.level)}</div>
            <div class="item__actions">
              <a class="btn btn--primary" href="#/guide/${esc(g.id)}">Open guide</a>
            </div>
          </div>
        `).join("")}
      </div>
      <div style="margin-top:10px">
        <a class="btn btn--ghost" href="#/guides">See all guides</a>
      </div>
    `)}
  `;

  wireQuickFilters();
}


function renderCategory(app, categoryId){
  const cat = state.categories.find(c => c.id === categoryId);
  if (!cat) return renderNotFound(app);

  const items = state.resources.filter(r => r.categoryId === categoryId);

  app.innerHTML = `
    ${card(cat.title, cat.summary, `
      <div class="small">
        ${esc(cat.note)}
      </div>
      <hr />
      <div class="list">
        ${items.map(r => resourceCard(r)).join("")}
      </div>
      <hr />
      <div class="small">
        Missing something? Add a “Submit an update” form link later (low-cost, low risk).
      </div>
    `)}
  `;
}

function resourceCard(r){
  const tagHtml = (r.tags || []).slice(0,6).map(t => `<span class="pill pill--muted">${esc(t)}</span>`).join("");
  const last = r.lastChecked ? `Last checked: ${esc(r.lastChecked)}` : "Last checked: Unknown";
  const source = r.sourceLabel ? `Source: ${esc(r.sourceLabel)}` : "Source: Public link";
  const expect = r.whatToExpect ? `<div class="small"><strong>What to expect:</strong> ${esc(r.whatToExpect)}</div>` : "";
  const bring = r.whatToBring ? `<div class="small"><strong>What to bring:</strong> ${esc(r.whatToBring)}</div>` : "";

  const actions = [
    r.phone ? `<a class="btn" href="tel:${esc(r.phone)}">Call</a>` : "",
    r.website ? `<a class="btn btn--primary" target="_blank" rel="noopener" href="${esc(r.website)}">Open site</a>` : "",
    r.directions ? `<a class="btn" target="_blank" rel="noopener" href="${esc(r.directions)}">Directions</a>` : "",
  ].filter(Boolean).join("");

  return `
    <div class="item">
      <div class="item__title">${esc(r.title)}</div>
      <div class="item__meta">${esc(r.area)} • ${esc(r.whoFor || "General")}</div>
      <div class="small">${esc(r.provides)}</div>
      ${expect}
      ${bring}
      <div class="pills">${tagHtml}</div>
      <div class="small" style="margin-top:8px">${esc(last)} • ${esc(source)}</div>
      <div class="item__actions">${actions}</div>
    </div>
  `;
}

function renderResources(app){
  // “Resource Links” page: safer than copying and maintaining lots of local listings early.
  const links = state.resources.filter(r => r.categoryId === "resource-rails");
  app.innerHTML = `
    ${card("Trusted resource directories (start here)", "These are external services", `
      <div class="small">
        We link to trusted resource directories. We do not control these services.
        Always confirm hours, eligibility, and availability.
      </div>
      <hr />
      <div class="list">
        ${links.map(r => resourceCard(r)).join("")}
      </div>
    `)}
  `;
}

function renderGuides(app){
  app.innerHTML = `
    ${card("Guides", "Short, practical, safety-first", `
      <div class="list">
        ${state.guides.map(g => `
          <div class="item">
            <div class="item__title">${esc(g.title)}</div>
            <div class="item__meta">${esc(g.readTime)} • ${esc(g.level)} • ${esc(g.topic)}</div>
            <div class="small">${esc(g.summary)}</div>
            <div class="item__actions">
              <a class="btn btn--primary" href="#/guide/${esc(g.id)}">Open guide</a>
            </div>
          </div>
        `).join("")}
      </div>
    `)}
  `;
}

function renderGuide(app, guideId){
  const g = state.guides.find(x => x.id === guideId);
  if (!g) return renderNotFound(app);

  const steps = (g.steps || []).map(s => `<li>${esc(s)}</li>`).join("");
  const safety = (g.safety || []).map(s => `<li>${esc(s)}</li>`).join("");
  const stuck = (g.ifStuck || []).map(s => `<li>${esc(s)}</li>`).join("");

  app.innerHTML = `
    ${card(g.title, `${g.readTime} • ${g.level}`, `
      <div class="p">${esc(g.summary)}</div>

      <div class="small"><strong>Goal:</strong> ${esc(g.goal)}</div>
      <div class="small"><strong>Time:</strong> ${esc(g.timeNeeded)}</div>
      <div class="small"><strong>Cost/materials:</strong> ${esc(g.materialsCost)}</div>

      <hr />

      <div class="h2">Steps</div>
      <ol class="small">${steps}</ol>

      <hr />

      <div class="h2">Safety notes</div>
      <ul class="small">${safety}</ul>

      <hr />

      <div class="h2">If you get stuck</div>
      <ul class="small">${stuck}</ul>

      <hr />

      <div class="small">
        Educational only. Confirm local rules and service availability.
        For immediate danger call <a href="tel:911">911</a>. In crisis call/text <a href="tel:988">988</a>.
      </div>
    `)}
  `;
}

function renderCrisis(app){
  app.innerHTML = `
    ${card("Crisis & Safety", "Fast actions", `
      <div class="grid">
        <a class="btn btn--danger" href="tel:911">Call 911 (Emergency)</a>
        <a class="btn btn--danger" href="tel:988">Call/Text 988 (Crisis)</a>
        <a class="btn btn--primary" href="#/guide/personal-safety">Personal safety guide</a>
        <a class="btn" href="#/disclaimer">Read disclaimers</a>
      </div>

      <hr />

      <div class="h2">Safety basics (quick)</div>
      <ul class="small">
        <li>Meet help only in public places (library, community center). Avoid isolated locations.</li>
        <li>Do not share SSN, bank info, or PINs with strangers.</li>
        <li>If someone pressures you, leave. Trust your instincts.</li>
        <li>If you feel unsafe now, call 911. If you are in emotional crisis, call/text 988.</li>
      </ul>
    `)}
  `;
}

function renderOffline(app){
  app.innerHTML = `
    ${card("Offline handbook", "Low-data options", `
      <div class="small">
        This site caches core pages for offline use after you open them once.
        For a printable/offline packet, create a “Print” section later (clean pages with guides + resource rails).
      </div>
      <hr />
      <div class="grid">
        <a class="btn btn--primary" href="#/guides">Open Guides</a>
        <a class="btn" href="#/resources">Trusted resource links</a>
        <a class="btn" href="#/categories">Categories</a>
        <a class="btn btn--danger" href="#/crisis">Crisis & Safety</a>
      </div>
      <hr />
      <div class="small">
        Tip: For offline use, open the pages you need while connected. They’ll be available even if your signal drops.
      </div>
    `)}
  `;
}

function renderDisclaimer(app){
  app.innerHTML = `
    ${card("Disclaimer (read this)", "Plain language", `
      <div class="small">
        <strong>Educational and informational only.</strong> This site provides general information and practical guides.
        It is not a service provider and does not guarantee that any resource is available.
      </div>
      <hr />
      <div class="small">
        <strong>Not medical/legal/financial advice.</strong> We are not your doctor, lawyer, or case manager.
        Use your judgment and confirm details with official sources.
      </div>
      <hr />
      <div class="small">
        <strong>Emergencies:</strong> Call <a href="tel:911">911</a> for immediate danger.
        If you are in emotional distress or thinking about self-harm, call/text <a href="tel:988">988</a>.
      </div>
      <hr />
      <div class="small">
        <strong>Safety:</strong> Avoid isolated meetings. Prefer public places (libraries, community centers).
        Do not share sensitive personal information with strangers.
      </div>
      <hr />
      <div class="small">
        <strong>Build/off-grid content:</strong> Any construction, electrical, or off-grid guidance is provided for general education.
        Local laws and safety requirements vary. Use qualified professionals when needed.
      </div>
      <hr />
      <div class="small">
        <strong>Accuracy:</strong> Resource links can change. Always confirm hours, eligibility, and availability with the provider.
        Listings show “source” and “last checked” where available.
      </div>
    `)}
  `;
}

function renderNotFound(app){
  app.innerHTML = card("Not found", "", `
    <div class="small">That page doesn’t exist. Go back to <a href="#/">Home</a>.</div>
  `);
}

/* ----------------- Init ----------------- */

(async function init(){
  await loadData();
  setBuildInfo();
  window.addEventListener("hashchange", route);
  route();
})();




