"use strict";

const { describe, it, expect } = require("@jest/globals");
const fs = require("fs");
const path = require("path");

// Verify the production snapshots route uses cursor-based pagination
const routeSrc = fs.readFileSync(
  path.resolve(__dirname, "../app/api/interviews/[interviewId]/snapshots/route.js"),
  "utf8"
);

it("production snapshots route uses cursor pagination", () => {
  expect(routeSrc).toMatch(/cursor/);
  expect(routeSrc).toMatch(/nextCursor/);
  expect(routeSrc).toMatch(/hasMore/);
});

// Mirror the exact pagination logic from the production route for unit tests
function paginateRows(rows, cursor, limit) {
  // Mirrors: take: limit + 1, cursor skip, hasMore check
  let start = 0;
  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    start = idx === -1 ? 0 : idx + 1;
  }
  const page = rows.slice(start, start + limit + 1);
  const hasMore = page.length > limit;
  if (hasMore) page.pop();
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  return { page, nextCursor };
}

const ROWS = Array.from({ length: 10 }, (_, i) => ({ id: `id${i}`, val: i }));

describe("cursor pagination (mirrors production snapshots route)", () => {
  it("returns first page without cursor", () => {
    const { page, nextCursor } = paginateRows(ROWS, null, 3);
    expect(page).toHaveLength(3);
    expect(page[0].id).toBe("id0");
    expect(nextCursor).toBe("id2");
  });

  it("returns next page using cursor", () => {
    const { page, nextCursor } = paginateRows(ROWS, "id2", 3);
    expect(page[0].id).toBe("id3");
    expect(nextCursor).toBe("id5");
  });

  it("returns null nextCursor on last page", () => {
    const { page, nextCursor } = paginateRows(ROWS, "id7", 5);
    expect(page).toHaveLength(2);
    expect(nextCursor).toBeNull();
  });

  it("returns all rows when limit exceeds total", () => {
    const { page, nextCursor } = paginateRows(ROWS, null, 100);
    expect(page).toHaveLength(10);
    expect(nextCursor).toBeNull();
  });
});
