#!/usr/bin/env tsx
/**
 * Script to create an admin user for the FitVibe backoffice
 *
 * Usage: pnpm --filter @fitvibe/backend exec tsx scripts/create-admin-user.ts
 *
 * Requires environment variables (set in .env or shell):
 * - ADMIN_USERNAME: Admin login alias
 * - ADMIN_PASSWORD: Admin password
 * - ADMIN_EMAIL: Admin email address
 *
 * Creates a user with role: admin, status: active
 */

import * as dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../src/db/connection.js";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_EMAIL) {
  console.error("❌ Missing required environment variables. See script header for required vars.");
  process.exit(1);
}
const ADMIN_DISPLAY_NAME = "Administrator";
const ADMIN_ROLE = "admin";
const ADMIN_STATUS = "active";

async function createAdminUser() {
  try {
    console.warn("Creating admin user...");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- knex .first() is untyped
    const existingUser = await db("users")
      .join("profiles as p", "p.user_id", "users.id")
      .whereRaw("LOWER(p.alias) = ?", [ADMIN_USERNAME.toLowerCase()])
      .first<{ id: string }>();

    if (existingUser) {
      console.warn("Admin user already exists. Skipping creation.");
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const adminRole = await db<{ code: string }>("roles").where("code", ADMIN_ROLE).first();
    if (!adminRole) {
      console.warn("Creating admin role...");
      await db("roles").insert({
        code: ADMIN_ROLE,
        description: "Platform administrator",
        created_at: now,
      });
    }

    await db.transaction(async (trx) => {
      await trx("users").insert({
        id: userId,
        display_name: ADMIN_DISPLAY_NAME,
        locale: "en-US",
        preferred_lang: "en",
        status: ADMIN_STATUS,
        role_code: ADMIN_ROLE,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      });

      await trx("user_contacts").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        type: "email",
        value: ADMIN_EMAIL.toLowerCase(),
        is_primary: true,
        is_recovery: true,
        is_verified: true,
        verified_at: now,
        created_at: now,
      });

      await trx("profiles").insert({
        user_id: userId,
        alias: ADMIN_USERNAME,
        alias_changed_at: now,
        visibility: "private",
        created_at: now,
        updated_at: now,
      });
    });

    console.warn("✅ Admin user created successfully!");
    console.warn(`   Role: ${ADMIN_ROLE}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

void createAdminUser();
