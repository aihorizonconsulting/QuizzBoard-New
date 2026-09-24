# Legacy Backup Migration

This folder contains tooling to transform the old Hono/Prisma PostgreSQL dump
(`backup.sql`) into SQL compatible with the new Spring Boot schema.

The raw dumps are intentionally ignored by Git because they contain user data
and password hashes.

## Generate the dev import file

```bash
python3 tools/migration/generate_backup_new.py --input backup.sql --output backup-new.sql
```

## Current generated coverage

The generator maps the legacy tables below into the new Spring Boot tables:

| Legacy table | New table |
| --- | --- |
| `Utilisateur` | `users` |
| `Quiz` | `quizzes` |
| `Question` | `quiz_questions` |
| `ChoixReponse` | `quiz_choices` |
| `Cours` | `courses` |
| `SectionCours` | `course_chapters` |
| `Participation` | `participations` |
| `Communaute` | `communities` |
| `MembreCommunaute` | `community_members` |

Generated from the current `backup.sql`, the import includes:

- 547 users
- 202 quizzes
- 1320 quiz questions
- 5295 choices
- 286 courses
- 2064 course chapters
- 1861 participations
- 33 communities
- 132 community memberships

## Import order for develop

1. Deploy/run the Spring Boot app on the develop database so Hibernate creates
   the new schema.
2. Back up the develop database.
3. Import `backup-new.sql` into the develop database.
4. Smoke-test login, quiz listing, course listing, participations, and admin
   stats before any production import.
