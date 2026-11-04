async function verify() {
  console.log("================================================================================");
  console.log(" LIVE HTTP SECURITY & SENSITIVE DATA DEFENSE VERIFICATION");
  console.log("================================================================================");

  // 1. Deleted samples directory must return 404
  const resSamples = await fetch("http://localhost:3000/samples/sample-internal-report.pdf");
  console.log(`1. GET /samples/sample-internal-report.pdf -> Status: ${resSamples.status} (Expected: 404)`);
  if (resSamples.status !== 404) {
    throw new Error(`Expected 404 for deleted samples, got ${resSamples.status}`);
  }

  // 2. Unauthenticated access to offer internal report document route must return 401
  const resOfferReport = await fetch("http://localhost:3000/api/documents/offers/non-existent-id/internal-report");
  console.log(`2. GET /api/documents/offers/.../internal-report -> Status: ${resOfferReport.status} (Expected: 401)`);
  if (resOfferReport.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated offer internal report, got ${resOfferReport.status}`);
  }

  // 3. Unauthenticated access to quote internal report document route must return 401
  const resQuoteReport = await fetch("http://localhost:3000/api/documents/quotes/non-existent-id/internal-report");
  console.log(`3. GET /api/documents/quotes/.../internal-report -> Status: ${resQuoteReport.status} (Expected: 401)`);
  if (resQuoteReport.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated quote internal report, got ${resQuoteReport.status}`);
  }

  // 4. Unauthenticated PUT to /api/settings must return 401 or 403 (Unauthorized/Forbidden)
  const resSettings = await fetch("http://localhost:3000/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agencyName: "Hacked Agency" }),
  });
  console.log(`4. PUT /api/settings unauthenticated -> Status: ${resSettings.status} (Expected: 401 or 403)`);
  if (![401, 403].includes(resSettings.status)) {
    throw new Error(`Expected 401 or 403 for unauthenticated settings update, got ${resSettings.status}`);
  }

  // 5. Unauthenticated GET to /api/auth/me must return 401
  const resAuthMe = await fetch("http://localhost:3000/api/auth/me");
  console.log(`5. GET /api/auth/me unauthenticated -> Status: ${resAuthMe.status} (Expected: 401)`);
  if (resAuthMe.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated auth me check, got ${resAuthMe.status}`);
  }

  // 6. Cache-Control Header on Protected Document Endpoints
  const cacheControl = resOfferReport.headers.get("cache-control");
  console.log(`6. Cache-Control Header on Protected Route: "${cacheControl}"`);
  if (!cacheControl || !cacheControl.includes("no-store")) {
    throw new Error(`Expected Cache-Control: no-store, got: ${cacheControl}`);
  }

  // 7. PWA Web Manifest Endpoint
  const resManifest = await fetch("http://localhost:3000/manifest.webmanifest");
  console.log(`7. GET /manifest.webmanifest -> Status: ${resManifest.status} (Expected: 200)`);
  if (resManifest.status !== 200) {
    throw new Error(`Expected 200 for manifest, got ${resManifest.status}`);
  }

  // 8. Health Check Endpoint
  const resHealth = await fetch("http://localhost:3000/api/health");
  const healthData = await resHealth.json();
  console.log(`8. GET /api/health -> Status: ${resHealth.status} (Expected: 200)`);
  console.log("   Health Payload:", JSON.stringify(healthData));
  if (resHealth.status !== 200 || healthData.status !== "healthy") {
    throw new Error(`Expected healthy status, got: ${JSON.stringify(healthData)}`);
  }

  console.log("\n================================================================================");
  console.log(" ✓ ALL LIVE HTTP SECURITY & CACHE INTEGRITY CHECKS PASSED PERFECTLY");
  console.log("================================================================================");
}

verify().catch((err) => {
  console.error("Live security verification failed:", err);
  process.exit(1);
});
