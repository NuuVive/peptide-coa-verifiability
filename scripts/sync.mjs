/**
 * Monthly sync: copy the newest edition from nuuvive.com into data/, then
 * publish it as a new version of the Zenodo record (DOI).
 *
 *   node scripts/sync.mjs            fetch + write files (+ Zenodo if ZENODO_TOKEN)
 *   node scripts/sync.mjs --dry-run  report what would change, write nothing
 *
 * The edition is the study page's Dataset JSON-LD `version`. An edition that
 * is already in data/ is a no-op, so the workflow can run as often as it likes.
 * zenodo.json holds the record to version from ({ conceptRecid, latestId }).
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const PAGE = "https://nuuvive.com/studies/verifiability-gap";
const CSV = `${PAGE}/data.csv`;
const ZENODO = "https://zenodo.org/api";
const dry = process.argv.includes("--dry-run");

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": "nuuvive-dataset-sync/1.0" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

function datasetLd(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const d = JSON.parse(m[1]);
    if (d["@type"] === "Dataset") return d;
  }
  throw new Error("no Dataset JSON-LD on the study page");
}

async function zenodo(path, { method = "GET", body, raw } = {}) {
  const url = path.startsWith("http") ? path : `${ZENODO}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.ZENODO_TOKEN}`, ...(raw ? { "Content-Type": "application/octet-stream" } : body ? { "Content-Type": "application/json" } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Zenodo ${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

function metadata(ld) {
  return {
    upload_type: "dataset",
    title: ld.name,
    description:
      `<p>${ld.description}</p><p>Findings, method and the corrections from a 100-report hand check: <a href="${PAGE}">${PAGE}</a>. ` +
      `Built from the PeptideBenchmark public COA API; record IDs, permalinks and provenance labels are preserved as its reuse terms ask. ` +
      `Inclusion of a report is not an endorsement of any product, store or laboratory.</p>`,
    creators: [{ name: "NuuVive" }],
    version: ld.version,
    publication_date: String(ld.dateModified ?? ld.datePublished).slice(0, 10),
    license: "cc-by-4.0",
    access_right: "open",
    language: "eng",
    keywords: ld.keywords,
    related_identifiers: [
      { identifier: PAGE, relation: "isSupplementTo", resource_type: "publication-other" },
      { identifier: "https://peptidebenchmark.com/testing/coas/api/", relation: "isDerivedFrom", resource_type: "dataset" },
      { identifier: "https://github.com/nuuvive/peptide-coa-verifiability", relation: "isSupplementedBy", resource_type: "dataset" },
    ],
  };
}

/** Publishes `file` as the first record (no zenodo.json yet) or a new version. Returns the published deposition. */
async function publishZenodo(ld, file, bytes) {
  const state = existsSync("zenodo.json") ? JSON.parse(await readFile("zenodo.json", "utf8")) : null;
  let draft;
  if (state) {
    const nv = await zenodo(`/deposit/depositions/${state.latestId}/actions/newversion`, { method: "POST" });
    draft = await zenodo(nv.links.latest_draft);
    for (const f of draft.files ?? []) await zenodo(`/deposit/depositions/${draft.id}/files/${f.id}`, { method: "DELETE" });
  } else {
    draft = await zenodo("/deposit/depositions", { method: "POST", body: {} });
  }
  await zenodo(`${draft.links.bucket}/${file}`, { method: "PUT", raw: bytes });
  await zenodo(`/deposit/depositions/${draft.id}`, { method: "PUT", body: { metadata: metadata(ld) } });
  const done = await zenodo(`/deposit/depositions/${draft.id}/actions/publish`, { method: "POST" });
  await writeFile("zenodo.json", JSON.stringify({ conceptRecid: done.conceptrecid, conceptDoi: done.conceptdoi, latestId: done.id, latestDoi: done.doi, version: ld.version }, null, 2) + "\n");
  return done;
}

const ld = datasetLd(await get(PAGE));
const edition = ld.version;
if (!/^\d{4}-\d{2}-\d{2}$/.test(edition ?? "")) throw new Error(`unexpected edition "${edition}"`);
const file = `verifiability-gap-${edition}.csv`;
const path = `data/${file}`;

if (existsSync(path)) {
  console.log(`edition ${edition} already in data/; nothing to do`);
} else {
  const csv = await get(CSV);
  if (!csv.startsWith("pb_record_id,")) throw new Error("data.csv does not look like the study CSV");
  console.log(`new edition ${edition}: ${csv.split("\n").length - 2} rows`);
  if (!dry) {
    await writeFile(path, csv);
    await writeFile("data/latest.csv", csv);
    const cff = await readFile("CITATION.cff", "utf8");
    await writeFile("CITATION.cff", cff.replace(/^version: .*$/m, `version: "${edition}"`).replace(/^date-released: .*$/m, `date-released: "${edition}"`));
  }
}

// Zenodo: publish this edition unless the record already has it.
const state = existsSync("zenodo.json") ? JSON.parse(await readFile("zenodo.json", "utf8")) : null;
if (state?.version === edition) {
  console.log(`Zenodo already has ${edition} (${state.latestDoi})`);
} else if (!process.env.ZENODO_TOKEN) {
  console.log("ZENODO_TOKEN not set; Zenodo skipped");
} else if (dry) {
  console.log(`would publish ${edition} to Zenodo (${state ? "new version" : "first record"})`);
} else {
  const done = await publishZenodo(ld, file, await readFile(path));
  console.log(`Zenodo published ${edition}: ${done.doi} (all versions: ${done.conceptdoi})`);
}
