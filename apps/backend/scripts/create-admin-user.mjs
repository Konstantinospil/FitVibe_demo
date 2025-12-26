#!/usr/bin/env node
/**
 * Script to create an admin user for the FitVibe backoffice
 *
 * Usage: node scripts/create-admin-user.mjs
 *
 * This script creates a user with:
 * - Username: administrator1
 * - Password: paS123
 * - Role: admin
 * - Status: active
 *
 * NOTE: This script is NOT committed to git (in .gitignore)
 */

import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Load environment variables
dotenv.config();

// Import db after env is loaded
const { db } = await import("../src/db/connection.js");

const ADMIN_USERNAME = "administrator1";
const ADMIN_PASSWORD = "paS123";
const ADMIN_EMAIL = "admin@fitvibe.local";
const ADMIN_DISPLAY_NAME = "Administrator";
const ADMIN_ROLE = "admin";
const ADMIN_STATUS = "active";

async function createAdminUser() {
  try {
    console.log("Creating admin user...");

    // Check if user already exists
    const existingUser = await db("users")
      .where("username", ADMIN_USERNAME)
      .orWhere("username", ADMIN_USERNAME.toLowerCase())
      .first();

    if (existingUser) {
      console.log(`User ${ADMIN_USERNAME} already exists. Skipping creation.`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if admin role exists
    const adminRole = await db("roles").where("code", ADMIN_ROLE).first();
    if (!adminRole) {
      console.log("Creating admin role...");
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

    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Role: ${ADMIN_ROLE}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

createAdminUser();
