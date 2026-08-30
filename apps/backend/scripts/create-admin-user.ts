#!/usr/bin/env tsx
/**
 * Script to create an admin user for the FitVibe backoffice
 *
 * Usage: pnpm --filter @fitvibe/backend exec tsx scripts/create-admin-user.ts
 *
 * Requires environment variables (set in .env or shell):
 * - ADMIN_USERNAME: Admin login username
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

    // Check if user already exists
    const existingUser = await db<{ id: string }>("users")
      .where("username", ADMIN_USERNAME)
      .orWhere("username", ADMIN_USERNAME.toLowerCase())
      .first();

    if (existingUser) {
      console.warn("Admin user already exists. Skipping creation.");
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if admin role exists
    const adminRole = await db<{ id: string }>("roles").where("code", ADMIN_ROLE).first();
    if (!adminRole) {
      console.warn("Creating admin role...");
      await db("roles").insert({
        code: ADMIN_ROLE,
        description: "Platform administrator",
        created_at: now,
      });
    }

    // Create user in transaction
    await db.transaction(async (trx) => {
      // Create user
      await trx("users").insert({
        id: userId,
        username: ADMIN_USERNAME,
        display_name: ADMIN_DISPLAY_NAME,
        locale: "en-US",
        preferred_lang: "en",
        status: ADMIN_STATUS,
        role_code: ADMIN_ROLE,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      });

      // Create email contact
      await trx("user_contacts").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        type: "email",
        value: ADMIN_EMAIL.toLowerCase(),
        is_primary: true,
        is_recovery: true,
        is_verified: true, // Auto-verify admin email
        verified_at: now,
        created_at: now,
      });

      // Create profile
      await trx("profiles").insert({
        user_id: userId,
        visibility: "private",
        unit_preferences: {},
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
