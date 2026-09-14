# 🎓 QUIZZBOARD CLIENT (Angular 19 Standalone)

> **Application Web SaaS moderne de création de quiz interactifs par IA, d'animation de sessions Live et de gestion de cohortes pédagogiques.**

---

## 🎨 Design System & Direction Artistique

Conforme aux spécifications strictes du **Design System QUIZZ** :
- **Couleur Primaire (Primary Yellow)** : `#FFC400` (CTA principaux, boutons d'action, médailles, progression).
- **Couleur Secondaire (Quizz Navy)** : `#032447` (Sidebar, Navbar, titres H1-H3, texte principal).
- **Couleur d'Accent (Quizz Orange)** : `#F4510B` (XP, streaks de flamme, alertes, badges dynamiques).
- **Typographie** : `Inter` (Google Fonts), poids 400, 500, 600, 700, 800.
- **Règle d'or** : **ZÉRO Dégradé artificiel**, ombres subtiles, micro-interactions fluides et lisibilité maximale.

---

## 🚀 Espaces Utilisateurs Intégrés

### 1. 🌐 Espace Public
- **Accueil / Landing Page** : Hero banner percutant, aperçu interactif, statistiques clés (15k+ quiz générés), 3 piliers d'évaluation et champ de saisie rapide de Code PIN.
- **Tarifs & Forfaits** : Grille des 3 plans (**FREE 0 F**, **STARTER 9 900 F / 15$**, **PRO 29 000 F / 49$**) avec convertisseur FCFA / USD et modal de paiement simulé (**Wave**, **Orange Money**, **Stripe**).
- **Connexion Rapide** : 1-clic demo login (Formateur, Apprenant, SuperAdmin) pour faciliter les tests et présentations.

### 2. 👨‍🏫 Espace Formateur / Créateur
- **Tableau de Bord** : 4 KPI cards (Quiz créés, Participants, Taux de réussite, Quiz terminés), bannière de lancement Live instantané et aperçu des quiz récents.
- **Gestion des Quiz** : Liste filtrable par catégorie et niveau de difficulté, modal de partage avec lien direct et code court, suppression et duplication.
- **Générateur IA & Éditeur Visuel** :
  - *Mode 1* : Générateur par prompt / sujet (avec suggestions en 1 clic).
  - *Mode 2* : Extracteur de quiz depuis document PDF / Word.
  - *Mode 3* : Création manuelle avec chronomètres, points et explications pédagogiques.
- **Arène Live Host** :
  - *Lobby* : Affichage géant du code PIN à 6 chiffres, instructions mobiles et liste des joueurs connectés en temps réel.
  - *Question en cours* : Timer interactif, compteur de réponses et progression.
  - *Podium Final* : Célébration animée Or (`#FFC400`), Argent (`#94A3B8`), Bronze (`#B45309`).
- **Hub Communautés & Cohortes** :
  - *Forum* : Fils de discussions et réponses instantanées entre élèves et formateurs.
  - *Documents & Supports* : Dépôt et téléchargement de cours PDF.
  - *Réunions Visio* : Planification de visios Google Meet, Zoom, Jitsi.
  - *Membres* : Annuaire des étudiants avec points d'XP et quiz complétés.
- **Abonnement & Facturation** : Jauges de quotas et historique des factures Wave / Orange Money / Stripe.

### 3. 🎓 Espace Apprenant / Participant
- **Participation Sans Compte (Invité)** : Rejoindre immédiatement une partie avec un code PIN et un pseudo via `/quiz/join`.
- **Arène de Jeu Interactive (`/quiz/play/:id`)** :
  - Chronomètre animé avec alertes visuelles.
  - 4 états de sélection des réponses (Neutre, Sélectionné `#FFF4CC`, Juste `#DCFCE7`, Faux `#FEE2E2`).
  - Feedback pédagogique immédiat avec explication complète.
  - Écran de score final en pourcentage avec attribution des points d'XP.
- **Tableau de Bord Membre** : Progression de niveau, compteur de série (streak 🔥), historique des évaluations.
- **Certificats de Réussite** : Génération automatique d'un certificat d'excellence PDF nominatif et vérifiable (avec code unique) dès 80% de score.
- **Mes Communautés** : Accès aux cours et réunions de la promotion.

### 4. 🛡️ Espace SuperAdmin (`/admin/dashboard`)
- Supervision des indicateurs de la plateforme (1 248 utilisateurs, 1 480 000 F MRR, 3 840 quiz hébergés).
- Tableau de modération des comptes avec badges de rôles et forfaits.

---

## 🛠️ Stack Technique & Architecture

- **Framework** : Angular 19 (Standalone Components, pas de `NgModules` obsolètes).
- **State Management** : Angular Signals réactifs (`signal`, `computed`, `asReadonly`).
- **Style** : SCSS Vanilla avec tokens Design System `:root` (pas de Tailwind lourd).
- **Routage** : Lazy loading granulaire sur toutes les vues de l'application.
- **Données** : Architecture de services injectables (`inject()`) avec mock data cohérente et prête pour intégration REST / WebSocket Spring Boot.

---

## 💻 Démarrage en Développement

```bash
# Se positionner dans le dossier client
cd QuizzBoard/quizzboard-client

# Installer les dépendances (si pas déjà fait)
npm install

# Démarrer le serveur de développement local
npm start
# -> L'application sera accessible sur http://localhost:4200
```

---

## 📦 Build de Production

```bash
npm run build
# Les artefacts optimisés sont générés dans dist/quizzboard-client/
```
