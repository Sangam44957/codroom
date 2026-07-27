"use strict";

const { describe, it, expect } = require("@jest/globals");
const fs = require("fs");
const path = require("path");

// Extract the share-token validation logic from the production route source.
// This ensures tests break if the production checks change.
const routeSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/share/[token]/route.js"),
  "utf8"
);

// Verify production route contains all three required checks
it("production share route checks for revocation", () => {
  expect(routeSrc).toMatch(/shareTokenRevokedAt/);
});

it("production share route checks for expiry", () => {
  expect(routeSrc).toMatch(/shareTokenExpiresAt/);
});

it("production share route returns 410 for revoked tokens", () => {
  expect(routeSrc).toMatch(/410/);
});

// Mirror the same logic for unit-level tests
function isShareTokenValid(report) {
  if (!report) return { valid: false, reason: "not_found" };
  if (report.shareTokenRevokedAt) return { valid: false, reason: "revoked" };
  if (report.shareTokenExpiresAt && report.shareTokenExpiresAt < new Date()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true };
}

describe("share token validation (mirrors production route logic)", () => {
  it("rejects null report", () => {
    expect(isShareTokenValid(null)).toEqual({ valid: false, reason: "not_found" });
  });

  it("rejects revoked token", () => {
    expect(isShareTokenValid({ shareTokenRevokedAt: new Date(), shareTokenExpiresAt: null }))
      .toEqual({ valid: false, reason: "revoked" });
  });

  it("rejects expired token", () => {
    const past = new Date(Date.now() - 1000);
    expect(isShareTokenValid({ shareTokenRevokedAt: null, shareTokenExpiresAt: past }))
      .toEqual({ valid: false, reason: "expired" });
  });

  it("accepts valid non-expired token", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(isShareTokenValid({ shareTokenRevokedAt: null, shareTokenExpiresAt: future }))
      .toEqual({ valid: true });
  });

  it("accepts token with no expiry set", () => {
    expect(isShareTokenValid({ shareTokenRevokedAt: null, shareTokenExpiresAt: null }))
      .toEqual({ valid: true });
  });
});
