// scripts/seed-loadtest.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { SignJWT } = require("jose");
const fs = require("fs");

const prisma = new PrismaClient();

// 5 rotating users so code_execution VUs never share a userId → no 429s
const USERS = Array.from({ length: 5 }, (_, i) => ({
  email: `loadtest${i + 1}@codroom.dev`,
  name:  `Load Tester ${i + 1}`,
}));
const PASSWORD   = "LoadTest123!";
const ROOM_TITLE = "__load-test-room__";

async function mintJwt(payload, expiresIn = "7d") {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 10);

  // Upsert all 5 users
  const users = await Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({
        where:  { email: u.email },
        update: { password: hashed, emailVerified: true },
        create: { name: u.name, email: u.email, password: hashed, emailVerified: true },
      })
    )
  );

  // Primary user owns the stable test room
  const primary = users[0];
  let room = await prisma.room.findFirst({ where: { createdById: primary.id, title: ROOM_TITLE } });
  if (!room) {
    room = await prisma.room.create({
      data: { title: ROOM_TITLE, language: "javascript", createdById: primary.id },
    });
  }

  // Mint a JWT + roomTicket for each user
  const jwts = await Promise.all(
    users.map((u) => mintJwt({ userId: u.id, email: u.email, name: u.name }))
  );
  const roomTicket = await mintJwt(
    { roomId: room.id, type: "room-session", candidateName: "LoadVU" },
    "8h"
  );

  console.log("✅ Load-test users:", USERS.map((u) => u.email).join(", "));
  console.log("✅ Test room id   :", room.id);

  fs.writeFileSync(
    "scripts/.loadtest-env.json",
    JSON.stringify({
      roomId:    room.id,
      joinToken: room.joinToken,
      jwt:       jwts[0],
      roomTicket,
    }, null, 2)
  );
  // Write each JWT on its own line — avoids JSON quoting issues when passed via bat env vars
  fs.writeFileSync("scripts/.loadtest-jwts.txt", jwts.join("\n"));
  console.log("✅ Written to scripts/.loadtest-env.json");
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
