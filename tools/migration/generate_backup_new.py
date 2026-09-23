#!/usr/bin/env python3
"""Generate Spring Boot compatible seed SQL from the legacy Hono/Prisma dump.

The generated SQL expects the Spring Boot schema to already exist. In practice,
run the app once against an empty dev database, then import backup-new.sql.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable


LEGACY_TABLES = {
    "Utilisateur",
    "Quiz",
    "Question",
    "ChoixReponse",
    "Cours",
    "SectionCours",
    "Participation",
    "Communaute",
    "MembreCommunaute",
    "SujetForum",
    "CommentaireForum",
}


def parse_copy_sections(path: Path) -> dict[str, list[dict[str, str | None]]]:
    sections: dict[str, list[dict[str, str | None]]] = {}
    current_table: str | None = None
    current_columns: list[str] = []

    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            if line.startswith("COPY public."):
                table_part, columns_part = line.split("(", 1)
                table_name = table_part.removeprefix("COPY public.").strip()
                table_name = table_name.strip('"')
                columns = columns_part.split(") FROM stdin;", 1)[0]
                current_columns = [clean_identifier(c.strip()) for c in columns.split(",")]
                current_table = table_name if table_name in LEGACY_TABLES else None
                if current_table:
                    sections.setdefault(current_table, [])
                continue

            if line == r"\.":
                current_table = None
                current_columns = []
                continue

            if not current_table:
                continue

            values = [decode_copy_value(value) for value in line.split("\t")]
            row = dict(zip(current_columns, values, strict=False))
            sections[current_table].append(row)

    return sections


def clean_identifier(value: str) -> str:
    return value.strip().strip('"')


def decode_copy_value(value: str) -> str | None:
    if value == r"\N":
        return None
    return (
        value.replace(r"\t", "\t")
        .replace(r"\n", "\n")
        .replace(r"\r", "\r")
        .replace(r"\\", "\\")
    )


def q(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def clipped(value: str | None, max_len: int) -> str | None:
    if value is None:
        return None
    return value[:max_len]


def truthy(value: str | None) -> bool:
    return value in {"t", "true", "1", "yes"}


def status_active(value: str | None) -> str:
    return "ACTIVE" if value in {None, "actif", "active"} else "SUSPENDED"


def user_role(row: dict[str, str | None], creator_ids: set[str]) -> str:
    if row.get("role") == "admin":
        return "ADMIN"
    if row.get("id") in creator_ids:
        return "CREATOR"
    return "LEARNER"


def quiz_status(value: str | None) -> str:
    if value == "publie":
        return "PUBLISHED"
    if value == "archive":
        return "ARCHIVED"
    return "DRAFT"


def course_level(value: str | None) -> str:
    return {
        "debutant": "BEGINNER",
        "intermediaire": "INTERMEDIATE",
        "avance": "ADVANCED",
        "expert": "ADVANCED",
    }.get(value or "", "INTERMEDIATE")


def course_status(value: str | None) -> str:
    return "PUBLISHED" if value == "publie" else "DRAFT"


def creator_names(users: Iterable[dict[str, str | None]]) -> dict[str, str]:
    names: dict[str, str] = {}
    for user in users:
        full = f"{user.get('prenom') or ''} {user.get('nom') or ''}".strip()
        names[user["id"] or ""] = full or (user.get("email") or "Utilisateur")
    return names


def write_insert(out, table: str, columns: list[str], values: list[object], conflict: str = "id") -> None:
    out.write(
        f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(q(v) for v in values)}) "
        f"ON CONFLICT ({conflict}) DO NOTHING;\n"
    )


def generate(input_path: Path, output_path: Path) -> None:
    data = parse_copy_sections(input_path)
    users = data.get("Utilisateur", [])
    quizzes = [row for row in data.get("Quiz", []) if row.get("deletedAt") is None]
    courses = [row for row in data.get("Cours", []) if row.get("deletedAt") is None]
    communities = [row for row in data.get("Communaute", []) if row.get("deletedAt") is None]

    creator_ids = {row.get("createur_id") for row in quizzes + courses if row.get("createur_id")}
    creator_ids.update(row.get("owner_id") for row in communities if row.get("owner_id"))
    names = creator_names(users)
    quiz_titles = {row.get("id"): row.get("titre") for row in quizzes}

    with output_path.open("w", encoding="utf-8") as out:
        out.write("-- Generated from backup.sql for QuizzBoard Spring Boot dev migration.\n")
        out.write("-- Import after the Spring Boot schema has been created.\n")
        out.write("BEGIN;\n")
        out.write("SET CONSTRAINTS ALL DEFERRED;\n\n")

        for row in users:
            if row.get("deletedAt") is not None or not row.get("email"):
                continue
            write_insert(
                out,
                "users",
                [
                    "id",
                    "prenom",
                    "nom",
                    "email",
                    "password",
                    "role",
                    "subscription_tier",
                    "auth_provider",
                    "avatar_url",
                    "xp_points",
                    "level",
                    "streak_days",
                    "followers_count",
                    "following_count",
                    "status",
                    "email_verified",
                    "created_at",
                    "updated_at",
                ],
                [
                    row.get("id"),
                    clipped(row.get("prenom") or "Utilisateur", 100),
                    clipped(row.get("nom") or "QuizzBoard", 100),
                    clipped((row.get("email") or "").lower(), 150),
                    row.get("password"),
                    user_role(row, creator_ids),
                    "FREE",
                    "GOOGLE" if row.get("type_compte") == "google" else "LOCAL",
                    row.get("photoProfile"),
                    0,
                    1,
                    1,
                    0,
                    0,
                    status_active(row.get("statut")),
                    True,
                    row.get("createdAt"),
                    row.get("updatedAt") or row.get("createdAt"),
                ],
            )

        out.write("\n")
        for row in communities:
            write_insert(
                out,
                "communities",
                [
                    "id",
                    "name",
                    "description",
                    "category",
                    "access_code",
                    "creator_id",
                    "creator_name",
                    "is_private",
                    "created_at",
                ],
                [
                    row.get("id"),
                    clipped(row.get("nom") or "Communaute", 150),
                    clipped(row.get("description"), 1000),
                    "GENERAL",
                    clipped(row.get("code_acces") or f"COMM-{row.get('id')}", 50),
                    row.get("owner_id"),
                    names.get(row.get("owner_id") or "", "Utilisateur"),
                    False,
                    row.get("createdAt"),
                ],
            )

        out.write("\n")
        for row in data.get("MembreCommunaute", []):
            write_insert(
                out,
                "community_members",
                ["id", "community_id", "user_id", "name", "email", "role", "quizzes_completed", "total_xp", "joined_at"],
                [
                    row.get("id"),
                    row.get("communaute_id"),
                    row.get("utilisateur_id"),
                    names.get(row.get("utilisateur_id") or "", "Utilisateur"),
                    None,
                    "CREATOR" if row.get("role") == "admin" else "STUDENT",
                    0,
                    0,
                    row.get("joined_at"),
                ],
            )

        out.write("\n")
        for row in quizzes:
            write_insert(
                out,
                "quizzes",
                [
                    "id",
                    "title",
                    "description",
                    "category",
                    "difficulty",
                    "status",
                    "creator_id",
                    "creator_name",
                    "cover_image",
                    "share_code",
                    "visibility",
                    "community_id",
                    "participations_count",
                    "average_score_percent",
                    "created_at",
                    "updated_at",
                ],
                [
                    row.get("id"),
                    clipped(row.get("titre") or "Quiz sans titre", 200),
                    clipped(row.get("description"), 1000),
                    row.get("type_quiz") or "GENERAL",
                    "MEDIUM",
                    quiz_status(row.get("statut")),
                    row.get("createur_id"),
                    names.get(row.get("createur_id") or "", "Utilisateur"),
                    row.get("image_url"),
                    clipped(row.get("lien_partage") or row.get("id"), 50),
                    "PUBLIC" if row.get("statut") == "publie" else "PRIVATE",
                    row.get("communaute_id"),
                    0,
                    0.0,
                    row.get("createdAt"),
                    row.get("updatedAt") or row.get("createdAt"),
                ],
            )

        out.write("\n")
        for row in data.get("Question", []):
            if row.get("deletedAt") is not None:
                continue
            write_insert(
                out,
                "quiz_questions",
                ["id", "text", "type", "time_limit_seconds", "points", "order_index", "quiz_id"],
                [
                    row.get("id"),
                    clipped(row.get("texte") or "Question", 1000),
                    "SINGLE_CHOICE",
                    int(row.get("duree") or 20),
                    100,
                    int(row.get("ordre") or 0),
                    row.get("quiz_id"),
                ],
            )

        out.write("\n")
        for row in data.get("ChoixReponse", []):
            write_insert(
                out,
                "quiz_choices",
                ["id", "text", "is_correct", "order_index", "question_id"],
                [
                    row.get("id"),
                    clipped(row.get("texte") or "Choix", 500),
                    truthy(row.get("est_correcte")),
                    int(row.get("ordre") or 0),
                    row.get("question_id"),
                ],
            )

        out.write("\n")
        for row in courses:
            write_insert(
                out,
                "courses",
                [
                    "id",
                    "title",
                    "description",
                    "category",
                    "level",
                    "cover_image",
                    "creator_id",
                    "creator_name",
                    "estimated_hours",
                    "status",
                    "has_chapter_quizzes",
                    "has_final_quiz",
                    "has_certificate",
                    "certificate_template_type",
                    "certificate_minimum_score",
                    "created_at",
                ],
                [
                    row.get("id"),
                    clipped(row.get("titre") or "Cours sans titre", 250),
                    clipped(row.get("description"), 1000),
                    row.get("theme") or "GENERAL",
                    course_level(row.get("niveau")),
                    row.get("image_url"),
                    row.get("createur_id"),
                    names.get(row.get("createur_id") or "", "Utilisateur"),
                    5,
                    course_status(row.get("statut")),
                    True,
                    True,
                    True,
                    "DEFAULT",
                    80,
                    row.get("createdAt"),
                ],
            )

        out.write("\n")
        for row in data.get("SectionCours", []):
            write_insert(
                out,
                "course_chapters",
                ["id", "order_index", "title", "summary", "content", "estimated_minutes", "has_quiz", "course_id"],
                [
                    row.get("id"),
                    int(row.get("ordre") or 0),
                    clipped(row.get("titre") or "Chapitre", 250),
                    clipped(row.get("type"), 1000),
                    row.get("contenu"),
                    int(row.get("duree_estimee") or 30),
                    False,
                    row.get("cours_id"),
                ],
            )

        out.write("\n")
        for row in data.get("Participation", []):
            write_insert(
                out,
                "participations",
                [
                    "id",
                    "quiz_id",
                    "quiz_title",
                    "user_id",
                    "participant_name",
                    "participant_email",
                    "score",
                    "max_score",
                    "percentage",
                    "time_total_seconds",
                    "status",
                    "certificate_eligible",
                    "completed_at",
                ],
                [
                    row.get("id"),
                    row.get("quiz_id"),
                    quiz_titles.get(row.get("quiz_id")) or "Quiz",
                    row.get("utilisateur_id"),
                    row.get("nom_participant") or row.get("pseudo_participant") or "Participant",
                    row.get("email_participant"),
                    int(row.get("score") or 0),
                    int(row.get("score_max") or 100),
                    float(row.get("pourcentage") or 0),
                    int(row.get("temps_total") or 0),
                    "COMPLETED" if row.get("statut") in {None, "termine", "completed"} else "IN_PROGRESS",
                    False,
                    row.get("date_fin") or row.get("createdAt"),
                ],
            )

        out.write("\nCOMMIT;\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="backup.sql", type=Path)
    parser.add_argument("--output", default="backup-new.sql", type=Path)
    args = parser.parse_args()
    generate(args.input, args.output)
    print(f"Generated {args.output}")


if __name__ == "__main__":
    main()
