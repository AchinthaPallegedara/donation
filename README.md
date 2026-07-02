# සුදුවැල්ල ශ්‍රී පුලිනතලාරාම රාජ මහා විහාරය — Donation Management System

A real-time donation collection and management web application built for temple administration. Collectors record donations on the ground, and admins review them in real-time from a dashboard.

---

## ✨ Features

### For Collectors
- 📝 Submit donations with donor name, amount, and optional comment
- Instant confirmation after recording a donation

### For Admins
- 📊 **Dashboard** — live stats (total amount, total donations, unread count)
- 📋 **All Donations Table** — view, filter, search, and export all donations to Excel
- 👥 **User Management** — create and delete collector/admin accounts
- 👁️ **View Donations** — review new donations one by one in a card view
  - **Fullscreen mode** — display each donation fullscreen (great for projectors/large screens)
  - Mark as Read with a button, or press `Enter` / `Space` keyboard shortcuts (in fullscreen)
  - Real-time updates via Firestore live listener

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + Radix UI |
| Icons | [Lucide React](https://lucide.dev) |
| Database | [Firebase Firestore](https://firebase.google.com/docs/firestore) |
| Auth | [Firebase Authentication](https://firebase.google.com/docs/auth) |
| Admin SDK | Firebase Admin SDK (server-side API routes) |
| Export | xlsx |

---

## 📁 Project Structure

```
donation/
├── app/
│   ├── page.tsx                  # Root page (login / dashboard based on role)
│   ├── layout.tsx                # Root layout (AuthProvider + Footer)
│   ├── globals.css
│   └── admin/
│       ├── layout.tsx            # Admin layout with Navigation bar
│       ├── table/                # All Donations table page
│       ├── users/                # User Management page
│       └── view/                 # View Donations page
├── components/
│   ├── navigation.tsx            # Top navigation bar
│   ├── admin-dashboard.tsx       # Admin home dashboard
│   ├── admin-table.tsx           # Donations table with export
│   ├── donation-form.tsx         # Collector donation form
│   ├── view-page.tsx             # One-by-one donation viewer
│   ├── login-form.tsx            # Login form
│   ├── footerBar.tsx             # Footer
│   └── ui/                       # shadcn/ui components
├── contexts/
│   └── auth-context.tsx          # Firebase auth context & user role
├── lib/
│   ├── firebase.ts               # Client-side Firebase init
│   └── firebase-admin.ts         # Server-side Admin SDK init
└── .env.local                    # Environment variables (not committed)
```

---

## 🚀 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- [npm](https://www.npmjs.com) or [bun](https://bun.sh)
- A [Firebase](https://console.firebase.google.com) project

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd donation
```

---

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

---

### 3. Firebase Setup

#### a) Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it → continue
3. Disable Google Analytics (optional) → **Create project**

#### b) Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Email/Password**

#### c) Create Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select your preferred region → **Done**

#### d) Set Firestore Security Rules

Go to **Firestore → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if the requester is an admin
    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Donations:
    //   - Admins can read, update, and delete any donation.
    //   - Any authenticated user (collector) can create a donation.
    //   - Collectors cannot read, update, or delete donations they did not create.
    match /donations/{docId} {
      allow create: if request.auth != null;
      allow read, update, delete: if isAdmin();
    }

    // Users:
    //   - Each user can read only their own document.
    //   - Admins can read any user document (needed for user management UI).
    //   - Writes go through the Admin SDK (server-side); no client writes allowed.
    match /users/{userId} {
      allow read: if request.auth != null
        && (request.auth.uid == userId || isAdmin());
    }
  }
}
```

Click **Publish**.

#### e) Get Firebase Client Config

1. Firebase Console → ⚙️ **Project Settings** → **General**
2. Scroll to **Your apps** → click **Web** (`</>`) → register app
3. Copy the `firebaseConfig` values

#### f) Create a Service Account (for Admin SDK)

1. Firebase Console → ⚙️ **Project Settings** → **Service accounts**
2. Click **Generate new private key** → **Generate key**
3. A `.json` file downloads — keep it safe, never commit it

---

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Client-side Firebase Config ──────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ── Server-side Firebase Admin SDK ───────────────────────────
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **Never commit `.env.local` to Git.** It is already listed in `.gitignore`.

---

### 5. Create the First Admin User

Since there is no public registration, the first admin must be created manually:

1. In Firebase Console → **Authentication** → **Users** → **Add user**
2. Enter email + password
3. Copy the **User UID**
4. Go to **Firestore** → `users` collection → **Add document**
   - Document ID: `<paste the UID>`
   - Fields:
     ```
     uid        (string)  → <UID>
     email      (string)  → admin@example.com
     name       (string)  → Admin Name
     role       (string)  → admin
     ```

After this, you can create more users (collectors/admins) from the **User Management** page inside the app.

---

### 6. Run the Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 7. Build for Production

```bash
npm run build
npm run start
```

---

## 🌐 Deployment

### Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add all environment variables from `.env.local` in the **Environment Variables** section
4. Click **Deploy**

> Make sure `FIREBASE_ADMIN_PRIVATE_KEY` is entered exactly with `\n` newlines preserved.

---

## 👤 User Roles

| Role | Permissions |
|---|---|
| `collector` | Can submit donations via the donation form |
| `admin` | Full access: dashboard, all donations table, user management, donation viewer |

---

## 🔑 Keyboard Shortcuts (View Donations — Fullscreen)

| Key | Action |
|---|---|
| `Enter` | Mark current donation as read |
| `Space` | Mark current donation as read |
| `Esc` | Exit fullscreen mode |

---

## 📦 Key npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🏗️ Built & Designed by

**[Claviq](https://claviq.com)** — © 2025 All rights reserved.
