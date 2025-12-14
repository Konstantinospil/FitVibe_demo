import type { Knex } from "knex";

/**
 * Migration to add exercise_name column to session_exercises table
 * for exercise snapshot functionality (Epic 2: Exercise Library).
 *
 * This allows historical sessions to preserve exercise names even if
 * exercises are later modified or archived.
 */
export async function up(knex: Knex): Promise<void> {
  // Use transaction to ensure atomicity
  await knex.transaction(async (trx) => {
    // Add exercise_name column
    await trx.schema.alterTable("session_exercises", (table) => {
      table
        .text("exercise_name")
        .nullable()
        .comment("Snapshot of exercise name at time of session creation");
    });

    // Populate exercise_name for existing records by joining with exercises table
    await trx.raw(`
      UPDATE session_exercises se
      SET exercise_name = e.name
      FROM exercises e
      WHERE se.exercise_id = e.id
        AND se.exercise_name IS NULL;
    `);

    // Verify data integrity: count records that should have been updated
    const verificationResult = await trx.raw<{
      rows: Array<{ total_with_exercise_id: string; total_with_exercise_name: string }>;
    }>(`
      SELECT COUNT(*) as total_with_exercise_id,
             COUNT(exercise_name) as total_with_exercise_name
      FROM session_exercises
      WHERE exercise_id IS NOT NULL;
    `);

    const totalWithExerciseId = Number(verificationResult.rows[0]?.total_with_exercise_id ?? 0);
    const totalWithExerciseName = Number(verificationResult.rows[0]?.total_with_exercise_name ?? 0);

    // If there's a mismatch, it means some exercises don't exist (orphaned references)
    // This is acceptable - we just log it, but don't fail the migration
    if (totalWithExerciseId > 0 && totalWithExerciseName < totalWithExerciseId) {
      console.warn(
        `Migration warning: ${totalWithExerciseId - totalWithExerciseName} session_exercises have exercise_id but no matching exercise (orphaned references)`,
      );
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("session_exercises", (table) => {
    table.dropColumn("exercise_name");
  });
}
