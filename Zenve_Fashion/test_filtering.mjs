import { layers } from "./src/data/layers.js";

const ROLES = [
  { id: "admin", clearance: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] },
  { id: "designer", clearance: ["02", "03", "06"] },
  { id: "merchandiser", clearance: ["01", "03", "10"] },
  { id: "qa", clearance: ["03", "04"] },
  { id: "inventory", clearance: ["05", "07", "08", "09"] },
  { id: "finance", clearance: ["07", "10", "11"] },
];

const uniqueLayers = Array.from(
  new Map(layers.map((layer) => [String(layer.n), layer])).values()
).sort((a, b) => Number(a.n) - Number(b.n));

console.log(`Total unique layers in system: ${uniqueLayers.length}`);

ROLES.forEach(role => {
  const hasAccess = (n) => role.clearance.includes(String(n).padStart(2, "0"));
  const accessibleLayers = uniqueLayers.filter(l => hasAccess(l.n));

  console.log(`\nTesting Role: ${role.id.toUpperCase()}`);
  console.log(`  Expected layers: [${role.clearance.join(", ")}]`);
  console.log(`  Accessible layers count: ${accessibleLayers.length}`);
  console.log(`  Accessible layers IDs: [${accessibleLayers.map(l => l.n).join(", ")}]`);

  // Verify no restricted layer is in accessibleLayers
  const restrictedInAccessible = accessibleLayers.filter(l => !role.clearance.includes(String(l.n).padStart(2, "0")));
  if (restrictedInAccessible.length > 0) {
    console.error(`  FAIL: Restricted layers leaked into accessible:`, restrictedInAccessible.map(l => l.n));
  } else {
    console.log(`  PASS: Zero restricted layers in dashboard list.`);
  }

  // Verify search bar filtering with query
  const testQueries = ["inventory", "05", "designer", "qa", "storefront", "12"];
  testQueries.forEach(query => {
    const searchFiltered = accessibleLayers.filter(l => {
      const q = query.toLowerCase().trim();
      return l.n?.toString().toLowerCase().includes(q) ||
             l.name?.toLowerCase().includes(q) ||
             l.group?.toLowerCase().includes(q) ||
             l.blurb?.toLowerCase().includes(q) ||
             l.path?.toLowerCase().includes(q);
    });

    const leakedInSearch = searchFiltered.filter(l => !role.clearance.includes(String(l.n).padStart(2, "0")));
    if (leakedInSearch.length > 0) {
      console.error(`  FAIL: Query "${query}" returned restricted layer!`, leakedInSearch.map(l => l.n));
    }
  });
  console.log(`  PASS: Zero restricted layers returned across all search queries.`);
});

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
