#!/usr/bin/env bash
# ==============================================================================
# QUIZZBOARD - REINITIALISATION + IMPORT DE LA BASE (local / dev / prod)
# ==============================================================================
# Usage (depuis la racine du projet) :
#   bash database/import-backup.sh <local|dev|prod> [fichier.sql]
#
# Etapes :
#   1. Sauvegarde complete de la base actuelle (database/backups/*.dump)
#   2. Arret du backend (aucune ecriture pendant l'import)
#   3. Vidage + import dans UNE transaction (rien n'est modifie en cas d'erreur)
#   4. Redemarrage du backend (DataInitializer recree admin@quizzboard.com)
#   5. Comptage des lignes importees
#
# Restauration de la sauvegarde si besoin :
#   docker cp database/backups/<fichier>.dump <conteneur_postgres>:/tmp/restore.dump
#   docker exec <conteneur_postgres> pg_restore -U <user> -d <db> --clean --if-exists /tmp/restore.dump
# ==============================================================================
set -euo pipefail
# Git Bash (Windows) : empeche la conversion de /tmp/... en chemin Windows
export MSYS_NO_PATHCONV=1

ENV_NAME="${1:-}"
SQL_FILE="${2:-database/quizzboard-reset-import.sql}"

case "$ENV_NAME" in
  local) PG_CONTAINER="quizzboard-postgres-1";    BACKEND_CONTAINER="quizzboard-backend-1" ;;
  dev)   PG_CONTAINER="quizzboard-dev-postgres";  BACKEND_CONTAINER="quizzboard-dev-backend" ;;
  prod)  PG_CONTAINER="quizzboard-prod-postgres"; BACKEND_CONTAINER="quizzboard-prod-backend" ;;
  *) echo "Usage : bash database/import-backup.sh <local|dev|prod> [fichier.sql]"; exit 1 ;;
esac

cd "$(dirname "$0")/.."

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Fichier introuvable : $SQL_FILE"; exit 1
fi
if [ -z "$(docker ps -q -f "name=^${PG_CONTAINER}$")" ]; then
  echo "❌ Le conteneur $PG_CONTAINER n'est pas demarre."; exit 1
fi

DB_USER="$(docker exec "$PG_CONTAINER" printenv POSTGRES_USER)"
DB_NAME="$(docker exec "$PG_CONTAINER" printenv POSTGRES_DB)"
psql_exec() { docker exec -i "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }

echo "===================================================="
echo " Environnement : $ENV_NAME"
echo " Conteneur DB  : $PG_CONTAINER  (base: $DB_NAME, user: $DB_USER)"
echo " Fichier SQL   : $SQL_FILE"
echo "===================================================="
echo "Contenu actuel :"
psql_exec -tAc "SELECT '  users=' || (SELECT count(*) FROM users) || '  quizzes=' || (SELECT count(*) FROM quizzes) || '  courses=' || (SELECT count(*) FROM courses) || '  participations=' || (SELECT count(*) FROM participations)"

if [ "$ENV_NAME" != "local" ]; then
  echo ""
  echo "⚠️  TOUTES les donnees de '$DB_NAME' vont etre SUPPRIMEES puis remplacees."
  read -r -p "Tapez le nom de la base ($DB_NAME) pour confirmer : " CONFIRM
  if [ "$CONFIRM" != "$DB_NAME" ]; then echo "Annule."; exit 1; fi
fi

# 1. Sauvegarde
mkdir -p database/backups
BACKUP_FILE="database/backups/${ENV_NAME}-${DB_NAME}-$(date +%Y%m%d-%H%M%S).dump"
echo "💾 1/5 Sauvegarde de la base actuelle -> $BACKUP_FILE"
docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/before-import.dump
docker cp "$PG_CONTAINER:/tmp/before-import.dump" "$BACKUP_FILE" > /dev/null
docker exec "$PG_CONTAINER" rm -f /tmp/before-import.dump

# 2. Arret du backend
echo "⏸️  2/5 Arret du backend ($BACKEND_CONTAINER)"
docker stop "$BACKEND_CONTAINER" > /dev/null

# 3. Import (le fichier contient BEGIN ... COMMIT)
echo "📥 3/5 Vidage + import (transaction unique)..."
if ! psql_exec -q < "$SQL_FILE" > /dev/null; then
  echo "❌ Import en echec : transaction annulee, la base est inchangee."
  docker start "$BACKEND_CONTAINER" > /dev/null
  exit 1
fi

# 4. Redemarrage du backend
echo "▶️  4/5 Redemarrage du backend..."
START_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker start "$BACKEND_CONTAINER" > /dev/null
for _ in $(seq 1 60); do
  LOGS="$(docker logs --since "$START_TS" "$BACKEND_CONTAINER" 2>&1 || true)"
  if echo "$LOGS" | grep -q "environnement QuizzBoard termin"; then echo "   Backend demarre."; break; fi
  if echo "$LOGS" | grep -q "APPLICATION FAILED"; then echo "❌ Le backend n'a pas demarre :"; echo "$LOGS" | tail -30; exit 1; fi
  sleep 2
done

# 5. Verification
echo "✅ 5/5 Contenu apres import :"
psql_exec -P pager=off -c "
SELECT 'users' AS table_name, count(*) FROM users UNION ALL SELECT 'communities', count(*) FROM communities
UNION ALL SELECT 'community_members', count(*) FROM community_members UNION ALL SELECT 'courses', count(*) FROM courses
UNION ALL SELECT 'course_chapters', count(*) FROM course_chapters UNION ALL SELECT 'quizzes', count(*) FROM quizzes
UNION ALL SELECT 'quiz_questions', count(*) FROM quiz_questions UNION ALL SELECT 'quiz_choices', count(*) FROM quiz_choices
UNION ALL SELECT 'participations', count(*) FROM participations;"
echo "Sauvegarde de l'ancienne base : $BACKUP_FILE"
