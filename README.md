# ASTRA RP — Club ASTRA Orléans

Application web complète de gestion des RP, réservations d'entrées gratuites par QR code, scanner caméra mobile pour le staff à l'entrée et classement annuel officiel pour le club **ASTRA** à Orléans.

---

## Règle Métier Fondamentale

> **`INSCRIPTION ≠ ENTRÉE`**  
> Une inscription via le lien d'un RP ne confère aucun point.  
> Seul un QR code scanné et validé à la porte par le staff à l'entrée crée un enregistrement dans la table `entries` et incrémente le classement annuel officiel.

---

## 1. Guide d'Installation Supabase (Pas-à-Pas)

Pour connecter votre application à Supabase, suivez scrupuleusement ces étapes concrètes :

### Étape 1 : Créer votre projet Supabase
1. Rendez-vous sur [https://supabase.com](https://supabase.com) et connectez-vous.
2. Cliquez sur le bouton vert **"New Project"**.
3. Remplissez les champs :
   - **Name** : `ASTRA RP`
   - **Database Password** : Définissez un mot de passe sécurisé (notez-le précieusement).
   - **Region** : Choisissez **`Europe (Frankfurt) eu-central-1`** ou **`Europe (Paris) eu-west-3`** (pour une latence minimale à Orléans).
4. Cliquez sur **"Create new project"** et patientez environ 1 à 2 minutes pendant l'initialisation.

### Étape 2 : Exécuter la Migration SQL
1. Dans le menu de gauche de Supabase, cliquez sur l'icône **SQL Editor** (icône `>_`).
2. Cliquez sur le bouton **"New query"** en haut.
3. Ouvrez sur votre ordinateur le fichier :  
   `supabase/migrations/20260917000001_astra_rp_init.sql`
4. Copiez l'intégralité du texte SQL contenu dans ce fichier.
5. Collez-le dans l'éditeur SQL de Supabase.
6. Cliquez sur le bouton vert **"Run"** (en bas à droite ou en haut à droite).
7. Le message *"Success. No rows returned"* confirme que toutes les tables, contraintes d'unicité, règles de sécurité RLS et la fonction atomique `check_in_guest` sont créées.

*(Facultatif - Test local)* : Pour insérer les 6 RP de démonstration et 2 soirées d'exemple, vous pouvez répéter la même opération avec le fichier `supabase/seed.sql`.

### Étape 3 : Récupérer vos Clés d'API
1. Dans le menu de gauche de Supabase, tout en bas, cliquez sur **Project Settings** (icône d'engrenage ⚙️).
2. Dans le sous-menu de gauche, cliquez sur **API**.
3. Vous y trouverez vos 3 clés indispensables :
   - **Project URL** (ex: `https://xyzcompany.supabase.co`) ➔ À copier pour `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys ➔ `anon` `public`** ➔ À copier pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API Keys ➔ `service_role` `secret`** (cliquez sur "Reveal" pour la démasquer) ➔ À copier pour `SUPABASE_SERVICE_ROLE_KEY`

### Étape 4 : Renseigner les Variables d'Environnement
Dans votre projet local, ouvrez le fichier `.env.local` et collez vos valeurs exactes :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-id-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Configuration du Premier Compte Administrateur

1. Dans Supabase, cliquez sur **Authentication** dans le menu de gauche (icône d'utilisateurs).
2. Cliquez sur **"Add user"** ➔ **"Create user"**.
3. Renseignez l'email et le mot de passe de votre choix pour l'administrateur.
4. Cochez **"Auto Confirm User?"** pour activer immédiatement le compte sans email de validation.
5. Cliquez sur **"Create user"**.
6. Rendez-vous dans **Table Editor** (menu de gauche) ➔ table **`profiles`**.
7. Trouvez la ligne de l'utilisateur que vous venez de créer et modifiez la colonne `role` de `promoter` à **`admin`**.
8. Vous pouvez désormais vous connecter sur [http://localhost:3000/login](http://localhost:3000/login) avec ces identifiants pour accéder à l'intégralité du dashboard !

---

## 3. Lancement en Local

```bash
# Installer les dépendances si ce n'est pas déjà fait
npm install

# Lancer la suite de tests automatisés (règles métier, tokens, classement)
npm test

# Lancer le serveur de développement local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 4. Parcours Utilisateurs & Pages

| Rôle | URL | Description |
|---|---|---|
| **Public / Invité** | `/rp/[slug]` | Page permanente du RP (ex: `/rp/lucas`) sans changement d'URL selon les soirées. Formulaire rapide d'inscription (3 champs). |
| **Pass Invité** | `/qr/[token]` | Affichage du QR code d'accès haute définition, téléchargeable dans la galerie. |
| **Staff Entrée** | `/scan` | Scanner caméra plein écran sur smartphone. Détection instantanée, flashs couleur (Vert = Validé, Orange = Déjà utilisé, Rouge = Invalide), réarmement automatique en 1.8s. |
| **Connexion** | `/login` | Espace sécurisé pour le personnel (Staff & Admin). |
| **Admin** | `/admin` | Dashboard opérationnel : entrées ce soir, inscriptions, RP actifs, top RP et accès direct au scanner. |
| **Admin** | `/admin/events` | Programmation des soirées et générateur de récurrence (ex: tous les samedis). |
| **Admin** | `/admin/promoters` | Création de RP, génération auto de slug unique, copie du lien permanent en un clic, statistiques détaillées. |
| **Admin** | `/admin/leaderboard` | Concours annuel calculé **strictement** sur les entrées réelles avec filtres par année, mois ou soirée. |
| **Admin** | `/admin/entries` | Journal des scans en direct avec export CSV formaté pour Microsoft Excel France. |
| **Admin** | `/admin/guests` | Répertoire des invités avec conformité RGPD (droit à l'oubli). |
| **Admin** | `/admin/audit-logs` | Journal d'audit et de traçabilité de toutes les actions sensibles. |

---

## 5. Déploiement sur Vercel (Production)

1. Rendez-vous sur [https://vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **"Add New..."** ➔ **"Project"**.
3. Sélectionnez le dépôt GitHub **`micheauquentin-sudo/RPGuesti`**.
4. Dans la section **Environment Variables**, ajoutez les 4 variables copiées de Supabase :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (l'URL fournie par Vercel, ex: `https://rpguesti.vercel.app`)
5. Cliquez sur **"Deploy"**.
6. En moins de 2 minutes, votre application est en ligne en production avec certificat SSL gratuit !
