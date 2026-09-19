# QuizzBoard — Plateforme SaaS d'Évaluation Interactive & Gamifiée 🚀

> **Version :** 1.0.0 (Production-Ready)  
> **Auteur :** IA Horizon Plus Consulting  
> **Stack :** Spring Boot 3.4.3 (Java 21) • Angular 18+ (Signals & Standalone) • PostgreSQL 16 • Redis 7 • PayDunya API Checkout v1

---

## 🌟 Présentation

**QuizzBoard** est une plateforme SaaS complète et sécurisée permettant aux enseignants, formateurs et organisations de créer des évaluations interactives, d'animer des sessions en direct (Live Arena), de gérer des cohortes (classes et promotions) et de monétiser leurs formations via la passerelle de paiement panafricaine **PayDunya**.

---

## 🏛️ Architecture & Composants

```
QuizzBoard/
├── quizzboard-backend/             # API REST Richardson Niveau 3 Spring Boot 3.4.3
│   ├── src/main/java/.../
│   │   ├── config/                 # PayDunyaConfig, SecurityConfig, DataInitializer
│   │   ├── controller/             # REST Endpoints (Auth, Quiz, Invitations, Payments, Admin)
│   │   ├── entity/                 # Modèles JPA (User, Quiz, Invitation, Invoice, etc.)
│   │   ├── repository/             # Spring Data JPA Repositories
│   │   ├── service/                # Logique métier & Enforcement strict des quotas
│   │   └── external/               # SmtpEmailService, Cloudinary
│   └── src/test/java/.../          # 33 Tests Automatisés (100% de réussite)
├── quizzboard-client/              # Frontend Angular 18+ Standalone & Signals
│   ├── src/app/pages/creator/      # Dashboard formateur, création quiz, abonnements
│   ├── src/app/pages/learner/      # Espace apprenant, certificats, arène de quiz
│   ├── src/app/pages/admin/        # Pilotage superadministrateur & finances
│   └── src/app/pages/public/       # Landing, tarifs, authentification, mot de passe oublié
├── docker-compose.yml              # Orchestration PostgreSQL, Redis, Backend, Client
└── .env.example                    # Modèle des variables d'environnement
```

---

## 💳 Intégration PayDunya (Checkout v1)

QuizzBoard prend en charge l'API officielle de paiement **PayDunya** :

- **Mode Dual :** `PAYDUNYA_MODE=test` (Sandbox) ou `PAYDUNYA_MODE=live` (Production).
- **Sécurité IPN :** Vérification de l'empreinte **SHA-512** de la clé Master sur les webhooks instantanés (`/api/v1/payments/paydunya/ipn`).
- **Mode Secours Local :** En environnement local sans clés renseignées, un simulateur sandbox automatique attribue le token `mock-{reference}` pour tester les parcours de souscription de bout en bout.

### Endpoints Paiement REST :
- `POST /api/v1/payments/initiate` : Initie un paiement (PayDunya, Wave, Orange Money).
- `POST /api/v1/payments/paydunya/initiate` : Initialisation directe de facture PayDunya.
- `GET|POST /api/v1/payments/paydunya/confirm` : Validation du paiement et activation de l'abonnement en temps réel.
- `POST /api/v1/payments/paydunya/ipn` : Webhook instantané server-to-server.

---

## ✉️ Système d'Invitations Sécurisées

Les formateurs peuvent inviter des élèves par email vers :
- **Classes Pédagogiques** (`CLASS`)
- **Communautés d'Apprenants** (`COMMUNITY`)
- **Sessions de Quiz en Direct** (`LIVE_QUIZ`)

### Endpoints Invitations REST :
- `POST /api/v1/invitations` : Créer et envoyer des invitations par email.
- `GET /api/v1/invitations/token/{token}` : Consulter les détails d'une invitation.
- `POST /api/v1/invitations/token/{token}/accept` : Accepter et rejoindre automatiquement la ressource.
- `POST /api/v1/invitations/token/{token}/decline` : Décliner l'invitation.

---

## ⚖️ Enforcement des Quotas Forfaits

Les limites métier sont appliquées strictement côté backend :

| Fonctionnalité | Forfait DÉCOUVERTE (FREE) | Forfait STARTER |
| :--- | :---: | :---: |
| **Quiz Actifs** | Max 3 quiz | Illimité |
| **Communautés** | Max 1 communauté | Max 10 communautés |
| **Générations IA** | Max 5 requêtes / mois | Max 100 requêtes / mois |
| **Sessions Live** | Jusqu'à 25 participants | Jusqu'à 300 participants |
| **Certificats Officiels** | ❌ Non inclus | ✅ Inclus avec QR Code |

---

## 📊 Éradication des Données Statiques

Tous les indicateurs clés (KPIs) et graphiques sont calculés dynamiquement depuis la base de données :
- **Dashboard Formateur :** Total des participations réelles, taux moyen de réussite calculé sur les scores, quiz complétés, répartition par catégorie issue des quiz réels.
- **Dashboard Apprenant :** Points d'XP réels cumulés, séries de jours consécutifs, historique réel des participations.
- **Dashboard Superadministrateur :** Comptage réel des utilisateurs, quiz, cours, transactions payées, et nombre total de questions via `QuestionRepository.count()`.

---

## 🧪 Tests Automatisés & Qualité

### 1. Tests Backend Spring Boot
Exécuter la suite complète de 33 tests automatisés :
```bash
cd quizzboard-backend
.\mvnw.cmd test
```
*Résultat :* **33 tests exécutés, 0 échec, 0 erreur (100% de succès)**.

Suites de tests incluses :
- `AuthServiceTest` : Inscription, unicité email, connexion réussie, mauvais mot de passe.
- `QuizServiceTest` : Création de quiz, liaison questions/choix, contrôle quota FREE (3 quiz).
- `ParticipationServiceTest` : Soumission de réponses, calcul de score, éligibilité certificat (≥70%), envoi d'email.
- `PayDunyaPaymentServiceTest` : Initiation checkout, confirmation token, validation hash SHA-512 IPN.
- `InvitationServiceTest` : Création d'invitations, envoi d'email, acceptation, refus, détection d'expiration.
- `NotificationServiceTest` : Création, comptage des non-lus, marquage lu, suppression.
- `QuotaEnforcementTest` : Rejet des dépassements de quotas quiz, communautés et requêtes IA.

### 2. Compilation de Production Frontend
Compiler l'application Angular sans avertissement ni erreur TypeScript/SCSS :
```bash
cd quizzboard-client
npm run build
```
*Résultat :* **Bundle de production généré avec succès dans `dist/quizzboard-client`**.

---

## 🚀 Démarrage Rapide

### Option A : Docker Compose
```bash
cp .env.example .env
docker compose up --build -d
```
- Frontend : `http://localhost:4200` (ou `http://localhost`)
- Backend API : `http://localhost:8080/api/v1`
- Swagger OpenAPI : `http://localhost:8080/api/v1/swagger-ui/index.html`

### Option B : Développement Local
Cette option fonctionne sans Docker, sans PostgreSQL local et avec une base H2 persistante dans `backend/data/`.

1. Backend :
   ```bash
   ./scripts/start-backend-local.sh
   ```
2. Frontend :
   ```bash
   ./scripts/start-frontend-local.sh
   ```
3. Ouvrir `http://localhost:4200`

Compte de démonstration local :
- Email : `admin@quizzboard.com`
- Mot de passe : `Password123!`

Notes locales :
- La génération IA fonctionne avec un moteur intégré si Gemini n'est pas disponible.
- Pour utiliser Gemini réellement, renseigner `GEMINI_API_KEY` et vérifier les crédits du projet Google AI Studio.
- Les emails sont désactivés en profil `local` tant que `SMTP_ENABLED=true`, `SMTP_USERNAME` et `SMTP_PASSWORD` ne sont pas définis.
- Les paiements restent en simulation tant que `ENABLE_PAYMENT_SIMULATION=true`.

---

## 🔐 Checklist de Mise en Production
- [x] Configurer `PAYDUNYA_MODE=live` avec les clés Master, Private et Token réelles dans le `.env`.
- [x] Renseigner les identifiants SMTP professionnels (Gmail App Password ou Brevo).
- [x] Définir une clé secrète JWT forte (`JWT_SECRET`) de 256 bits minimum.
- [x] Configurer Cloudinary pour l'hébergement pérenne des avatars et couvertures de quiz.
- [x] Vérifier que les URL de redirection et de webhooks pointent vers votre nom de domaine HTTPS.

---
© 2026 QuizzBoard • IA Horizon Plus Consulting. Tous droits réservés.
