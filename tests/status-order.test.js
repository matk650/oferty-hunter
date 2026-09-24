const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
function functionSource(name) {
  const start = html.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} exists`);
  const next = html.indexOf("\n}\n", start);
  assert(next >= 0, `${name} ends`);
  return html.slice(start, next + 3);
}

const context = {
  O: [], DECS: [], sortBy: "status_desc",
  norm: s => s === "seen" ? "rej" : (s || "new"),
  pm2: o => o.pr / o.a,
};
vm.createContext(context);
vm.runInContext(functionSource("sortRows") + "\n" + functionSource("applyStatusDates"), context);

context.O = [
  { id: "older", st: "short", d: "2026-09-24", upd: "2026-09-24T13:00:00Z", sc: "" },
  { id: "newer", st: "short", d: "2026-08-01", upd: "2026-08-01T10:00:00Z", sc: "" },
  { id: "fallback", st: "rej", d: "2026-07-01", upd: "2026-09-05T10:00:00Z", sc: "" },
  { id: "db", st: "hidden", d: "2026-07-01", upd: "2026-09-24T10:00:00Z", sc: "2026-09-10T10:00:00Z" },
];
context.DECS = [
  { offer_id: "older", status: "short", decided_at: "2026-08-05T10:00:00Z" },
  { offer_id: "newer", status: "short", decided_at: "2026-09-20T10:00:00Z" },
  { offer_id: "newer", status: "short", decided_at: "2026-09-22T10:00:00Z" },
  { offer_id: "db", status: "hidden", decided_at: "2026-09-11T10:00:00Z" },
];
context.applyStatusDates();
assert.equal(context.O[1].sc, "2026-09-22T10:00:00Z", "latest entry into status wins");
assert.equal(context.O[2].sc, "2026-09-05T10:00:00Z", "legacy entry falls back to updated_at");
assert.equal(context.O[3].sc, "2026-09-10T10:00:00Z", "database status timestamp wins");
assert.deepEqual(Array.from(context.sortRows(context.O.slice(0, 2)).map(o => o.id)), ["newer", "older"]);
console.log("status-order tests passed");
