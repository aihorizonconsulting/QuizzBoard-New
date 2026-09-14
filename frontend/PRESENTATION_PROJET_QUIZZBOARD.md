# DOSSIER DE PRÉSENTATION STRATÉGIQUE DU PROJET QUIZZBOARD
**Plateforme SaaS EdTech d'Apprentissage, d'Évaluation Interactive et de Certification**
*Auteur : IA Horizon Plus Consulting / Direction Technique & Produit*
*Date : Septembre 2026*

---

## 1. VISION, POSITIONNEMENT ET PROMESSE DU PROJET

### 1.1. Contexte et Vision Globale
Dans le paysage éducatif et de la formation professionnelle actuel, les formateurs, enseignants et écoles sont confrontés à une fragmentation importante de leurs outils :
- Un outil pour créer et diffuser des quiz interactifs en direct (ex: Kahoot, Quizizz).
- Une plateforme distincte et complexe pour structurer des cours et programmes (LMS lourds type Moodle, Canvas).
- Des solutions manuelles ou tierces pour concevoir et délivrer des attestations de réussite.
- Des moyens de paiement peu adaptés aux réalités africaines et émergentes (manque d'intégration native du Mobile Money tel que Wave et Orange Money).

**QuizzBoard** a été conçu pour briser ces silos en proposant une **plateforme tout-en-un unifiée**, moderne, intuitive et hautement interactive. QuizzBoard réunit l'excellence pédagogique d'un LMS moderne (cours magistraux, leçons chapitrées, objectifs d'apprentissage à la OpenClassrooms), la ludification d'une salle de classe interactive en direct (Quiz Live gamifiés) et la puissance de l'Intelligence Artificielle générative.

### 1.2. Proposition de Valeur Unique (UVP)
1. **Gain de temps radical pour le formateur** : Création instantanée d'évaluations et de cours complets par IA à partir d'un simple thème ou du dépôt d'un support existant (PDF, diapositives, documents).
2. **Engagement total de l'apprenant** : Interface gamifiée (points XP, badges de niveau, flammes d'assiduité, classements en temps réel, animations dynamiques).
3. **Pédagogie certifiante clé en main** : Délivrance automatisée de certificats officiels infalsifiables ou selon la charte graphique personnalisée du formateur.
4. **Accessibilité financière et technologique** : Pensé mobile-first, fonctionnant avec une bande passante optimisée, avec facturation transparente en Francs CFA et Dollars, intégrée aux moyens de paiement du quotidien (Wave, Orange Money, Cartes).

---

## 2. FONCTIONNALITÉS UTILISATEURS DÉTAILLÉES PAR ESPACE

Le système QuizzBoard s'articule autour de quatre espaces ergonomiques et cloisonnés :

---

### 2.1. ESPACE FORMATEUR / ENSEIGNANT (`/app/dashboard`, `/app/quizzes`, `/app/courses`, ...)

L'espace Formateur est le centre de pilotage de l'enseignant, conçu pour éliminer toute friction administrative.

#### A. Studio de Création Pédagogique Assisté par IA (`/app/quiz-create`)
- **Double Mode Unifié** :
  - **Mode Quiz** : Génération de questionnaires à choix multiples (QCM), choix unique, timer paramétrable par question (10s à 90s), explications pédagogiques automatiques.
  - **Mode Cours Structuré** : Génération de curriculums complets avec définition du nombre de chapitres (3, 5, 8 ou personnalisé), temps de lecture estimé, résumés de synthèse, quiz d'étape par chapitre et examen final.
- **Sources d'Alimentation Multiples** :
  - Par prompt thématique rédigé.
  - Par téléversement de documents pédagogiques (PDF, cours magistral, fiches de révision).
- **Configuration Avancée de la Certification** :
  - Commutateur `Certificat de réussite : [ Oui | Non ]`.
  - Conditionnement de l'obtention (score minimum requis, ex : 80%).
  - **Choix du Gabarit de Diplôme** :
    - *Modèle Officiel QuizzBoard (Défaut)* : Cadre solennel avec sceaux de conformité, QR code d'authenticité et signatures dynamiques.
    - *Modèle Personnalisé (Upload)* : Possibilité pour le formateur de téléverser la maquette de son école, université ou entreprise (formats PNG, JPG, SVG) avec prévisualisation fidèle et ajustement sans débordement.

#### B. Gestion des Cours Magistraux (`/app/courses` & `/app/courses/:id`)
- **Catalogue Personnel** : Affichage en grille ou en liste, filtres par niveau (Débutant, Intermédiaire, Avancé) et filtre rapide dédié aux cours **Certifiants**.
- **Lecteur Pédagogique Formateur** : Visualisation du programme, objectifs d'apprentissage clés, temps de formation global et détails de chaque chapitre.
- **Édition Rapide & Directe** : Modification du titre, de la description, des chapitres, des quiz associés et de la politique de certification via des modales en plein écran immersives.
- **Lancement d'Examen Final en Live** : Capacité de transformer instantanément l'examen final d'un cours en session de groupe interactive en direct.

#### C. Sessions Live Gamifiées (`/app/live-manage` & `/live/host`)
- Animation de sessions synchrones projetables en amphithéâtre ou à distance.
- Code PIN à 6 chiffres et QR code scannable par les apprenants.
- Gestion du rythme des questions, podium interactif, leaderboard en direct, sons dynamiques et gestion des participants connectés.

#### D. Gestion des Classes & Promotions (`/app/classes`)
- Création de promotions (ex: Master 2 Data Science, Licence 3 Gestion).
- Assignation sélective de cours et de quiz à des classes ciblées.
- Suivi de l'effectif des étudiants et statistiques de participation.

#### E. Communautés d'Apprenants (`/app/communities`)
- Création d'espaces d'échanges privés ou publics.
- Partage de documents de cours, de méthodologie et annonces pédagogiques.

#### F. Mon Forfait & Facturation (`/app/subscription`)
- Vue claire et sans fard sur la formule active (`FREE` ou `STARTER`).
- Suivi des jauges de consommation en temps réel (nombre de cours créés, crédits d'IA, capacité simultanée de participants).
- Historique exhaustif des factures avec téléchargement des reçus fiscaux en PDF.

---

### 2.2. ESPACE APPRENANT / ÉTUDIANT (`/app/learner/...`)

L'expérience élève a été pensée pour maximiser la rétention d'attention et transformer l'apprentissage en une aventure stimulante.

#### A. Tableau de Bord Pédagogique Gamifié (`/app/learner/dashboard`)
- Suivi du total de points d'expérience (XP), niveau d'expertise, taux de réussite moyen.
- Suivi de l'assiduité avec compteur de flammes (*Daily Streak*).
- Accès direct aux cours en cours de lecture et aux devoirs urgents.

#### B. Mes Cours & Progression (`/app/learner/courses`)
- Interface de lecture immersive type OpenClassrooms : découpage étape par étape, jauge de progression par pourcentage, marquage automatique des chapitres validés.
- Évaluations intermédiaires à la fin de chaque chapitre pour valider la compréhension avant de débloquer la suite.
- Examen final de validation conditionnant l'obtention du diplôme.

#### C. Mes Certifications & Diplômes (`/app/learner/certificates`)
- Portfolio complet des attestations obtenues par l'étudiant.
- **Visualisation Haute Définition** : Rendu fidèle du certificat décerné (avec note obtenue, mention Bien/Très Bien/Excellence, date d'obtention, nom du professeur et code unique d'authenticité).
- Export en PDF prêt à l'impression ou au partage sur LinkedIn.

#### D. Mes Classes & Communautés (`/app/learner/classes` & `/app/learner/communities`)
- Possibilité de rejoindre une classe ou une communauté en 1 clic grâce à un code sécurisé à 6 caractères.
- Accès aux ressources partagées et aux évaluations assignées par le corps professoral.

#### E. Découvrir (`/app/decouvrir` & `/app/explore`)
- Annuaire public de quiz éducatifs accessibles en libre accès pour s'entraîner en toute autonomie.

#### F. Expérience de Participation Live (`/live/play`)
- Interface mobile réactive, tactile et ultra-rapide.
- Choix de pseudo et d'avatar, boutons de réponse codés par couleur et forme géométrique, retour visuel immédiat après validation.

---

### 2.3. ESPACE ADMINISTRATEUR (`/admin/dashboard`)
- Supervision globale des indicateurs clés de performance (KPI) : nombre total d'inscrits, formateurs actifs, volume de quiz et de cours hébergés.
- Gestion des utilisateurs (suspension, activation, attribution de rôles).
- Surveillance du modèle économique et des flux d'abonnements.

---

### 2.4. ESPACE PUBLIC & PORTAIL VISITEUR
- **Page d'Accueil (`/`)** : Vitrine moderne valorisant les témoignages, la réassurance pédagogique, les partenaires universitaires et les fonctionnalités phares.
- **Grille Tarifaire (`/tarifs`)** : Présentation claire et transparente des deux formules avec simulateur de devises (FCFA / USD) et modale de souscription instantanée.
- **Authentification Sécurisée (`/connexion` & `/inscription`)** :
  - Connexion rapide via Google ou identifiants classiques.
  - Boutons de démonstration « 1 clic » pour tester instantanément les interfaces en tant que formateur gratuit, formateur abonné, élève ou administrateur.

---

## 3. MODÈLE ÉCONOMIQUE (BUSINESS MODEL) & JUSTIFICATION DES CHOIX

### 3.1. La Nouvelle Grille Tarifaire à Deux Niveaux

Nous avons délibérément structuré l'offre commerciale autour de **deux formules simples, sans ambiguïté** :

| Composante | Formule 1 : FREE (Gratuit) | Formule 2 : STARTER (Payant) |
| :--- | :--- | :--- |
| **Tarification** | **0 FCFA / 0 $** à vie | **9 900 FCFA / mois** *(ou 15 $ USD / mois)* |
| **Positionnement** | Découverte, évaluation ponctuelle, prise en main | Formateurs réguliers, enseignants du supérieur, écoles & académies |
| **Volume de Quiz & Cours** | 3 quiz / cours actifs simultanément | **Illimité** |
| **Capacité en Session Live** | Jusqu'à 25 participants | **Jusqu'à 200 participants simultanés** *(Format amphi)* |
| **Classes & Communautés** | 1 communauté privée (25 élèves max) | **Illimitées** |
| **Générations IA (Prompt & OCR)** | 5 par mois | **Illimitées** |
| **Délivrance de Certificats** | ✕ Non incluse | **✓ Incluse** *(Modèle officiel QuizzBoard & maquettes personnalisées)* |
| **Export des Données & Notes** | ✕ Non inclus | **✓ Inclus** *(Fichiers Excel et CSV complets)* |
| **Visioconférence & Live** | Standard | **✓ Incluse avec support prioritaire 7j/7** |

---

### 3.2. Justification Stratégique de la Suppression de l'Offre PRO

Le choix de supprimer le forfait PRO (qui était initialement envisagé à 29 000 FCFA) et de concentrer l'intégralité des fonctionnalités premium dans l'offre **STARTER** repose sur des impératifs économiques, psychologiques et opérationnels majeurs :

#### 1. Élimination de la « Paralysie du Choix » (Paradox of Choice)
Dans les modèles SaaS B2C/B2B ciblant les professionnels de l'éducation, proposer trois forfaits (Free, Starter, Pro) crée fréquemment de la confusion : l'enseignant ou l'école hésite entre Starter et Pro, se demande s'il ne va pas être bridé, et finit par repousser son acte d'achat. En ayant uniquement deux options — **« Je teste gratuitement »** ou **« Je débloque tout en illimité pour 9 900 F »** — le tunnel de conversion devient limpide et sans hésitation.

#### 2. Création d'une Proposition de Valeur Irrésistible (*No-Brainer Offer*)
À 9 900 FCFA / mois (environ 15 € ou 15 $), le forfait STARTER inclut désormais :
- Les quiz et cours illimités.
- L'IA illimitée.
- La certification de réussite (officielle et avec téléversement de maquette personnalisée).
- Une jauge d'amphithéâtre de 200 étudiants en direct.
Pour un enseignant ou un centre de formation, le retour sur investissement est immédiat dès la première session de cours ou de certification. Le prix psychologique se situe sous la barre symbolique des 10 000 FCFA, ce qui autorise un paiement par impulsion via Mobile Money.

#### 3. Alignement avec les Réalités de Paiement Locales (Afrique & International)
Sur le continent africain, les achats institutionnels de logiciels à plus de 25 000 FCFA nécessitent souvent des validations hiérarchiques ou des cartes de crédit internationales. À 9 900 FCFA, l'abonnement est payé directement par le formateur ou le responsable de département via son compte personnel **Wave** ou **Orange Money**, en quelques secondes depuis son smartphone.

#### 4. Réduction du Coût d'Acquisition Client (CAC) & Maximisation de la Valeur Vie (LTV)
Un forfait attractif et complet fidélise durablement les utilisateurs. Le taux de churn (résiliation) est drastiquement réduit car les utilisateurs ont le sentiment de disposer d'un outil complet sans sentiment de frustration lié à des barrières artificielles.

---

## 4. EXCELLENCE TECHNIQUE ET DESIGN SYSTEM

Le projet a été développé selon les standards industriels les plus rigoureux :
1. **Architecture Angular Moderne (Standalone & Signals)** :
   - Élimination des NgModule superflus pour une légèreté maximale du bundle final.
   - Utilisation exclusive des Angular Signals pour une réactivité chirurgicale du DOM sans surcharge de cycles de détection de changements.
   - Temps de compilation et de chargement ultra-performants (bundle initial inférieur à 460 kB).
2. **Design System Épuré et Cohérent** :
   - Palette de couleurs professionnelle : Bleu marine profond (`#032447`), Or prestige (`#D4AF37`), accents ambrés et touches de validation vertes.
   - Typographie soignée avec contrastes vérifiés (accessibilité WCAG).
   - Finitions soignées : modales avec backdrop plein écran unifié (`100vw` × `100vh`), boutons interactifs au survol, cartes contenues sans dépassement graphique.
3. **Résilience et Sécurité** :
   - Séparation stricte des privilèges selon les rôles (Formateur, Apprenant, SuperAdmin).
   - Gestion des codes de vérification uniques pour empêcher toute falsification des attestations de réussite.

---

## 5. CONCLUSION ET FEUILLE DE ROUTE

Avec cette refonte complète, **QuizzBoard** n'est plus seulement un outil de quiz : c'est un **écosystème pédagogique complet**, capable d'accompagner une institution depuis la conception du cours magistral par IA jusqu'à la remise du diplôme officiel de l'étudiant.

En resserrant le modèle commercial sur **FREE** et **STARTER (Illimité à 9 900 FCFA)**, la plateforme combine une accessibilité massive et une rentabilité pérenne, parfaitement taillée pour conquérir le marché de l'EdTech francophone et panafricaine.
