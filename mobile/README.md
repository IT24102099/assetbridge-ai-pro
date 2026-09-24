# AssetBridge AI — Mobile Application (Flutter)

*Your Assets. Always Closer.*

Cross-platform mobile client for property owners, field representatives, service providers, and property managers.

---

## 📱 Mobile Architecture

The mobile application communicates exclusively with the **ASP.NET Core Web API (Port 5206)**. It never connects directly to PostgreSQL or the internal Python AI service.

```
Flutter Mobile Client (Android / iOS)
          │
          │ HTTP / REST (JWT Bearer Token)
          ▼
ASP.NET Core Web API (Port 5206)
   ├── Controllers & Auth Middleware
   ├── Application Services
   └── PostgreSQL Database (Port 5432)
          │
          │ Internal Agent Orchestration (Port 5001)
          ▼
Internal Agentic AI Service (FastAPI)
```

---

## 🏗️ Project Structure

```
mobile/
├── lib/
│   ├── core/
│   │   ├── config/          # AppConfig & base URL configuration
│   │   ├── constants/       # AppColors, typography tokens
│   │   ├── networking/      # ApiClient (http + token interceptor)
│   │   ├── storage/         # TokenStorage (SharedPreferences)
│   │   └── theme/           # Material 3 AppTheme
│   ├── shared/
│   │   ├── models/          # ApiResponse, PagedResponse, UserModel
│   │   └── widgets/         # AppButton, StatusBadge, StatCard, FeedbackStates
│   ├── features/
│   │   ├── auth/            # LoginScreen, AuthService, AuthProvider
│   │   ├── dashboard/       # Role-based Dashboard with BottomNav
│   │   ├── assets/          # My Properties, Details, Media Gallery, Timeline (M1)
│   │   ├── incidents/       # Defect List, Report Defect with Photos (M1)
│   │   ├── providers/       # Verified Contractors & Matching (M2)
│   │   ├── inspections/     # Field Assessment Tasks & Findings (M3)
│   │   ├── quotations/      # Contractor Proposals & Line-Items (M3)
│   │   ├── maintenance/     # Active Work Orders & Completion (M3)
│   │   ├── workflows/       # 15-State Workflow, Timeline, AI Review, Approval (M4)
│   │   ├── continuity/      # Post-Maintenance Warranty & Health Tracking (M4)
│   │   └── profile/         # Profile & API Target Host Setting
│   └── main.dart            # MultiProvider entrypoint & AuthWrapper
├── test/
│   ├── model_test.dart      # Unit tests for JSON deserialization
│   └── widget_test.dart     # Widget tests for UI components
└── pubspec.yaml
```

---

## 🚀 Setup & Local Execution

### Prerequisites
- Flutter SDK `>=3.10.0`
- Dart SDK `>=3.0.0`
- Android Studio / VS Code with Flutter extension
- Android Emulator or Physical Device

### 1. Install Dependencies
```bash
cd mobile
flutter pub get
```

### 2. Configure Backend Target Host
The app connects to the ASP.NET Core API at:
- **Android Emulator:** `http://10.0.2.2:5206/api` (Default)
- **Physical Device:** `http://<YOUR_LOCAL_IP>:5206/api`

You can also dynamically change the endpoint inside the app via **Profile & Settings > Backend Endpoint Settings**.

### 3. Run Mobile App
```bash
flutter run
```

### 4. Build APK
```bash
flutter build apk --debug
```

### 5. Run Automated Tests
```bash
flutter test
```

---

## 👥 Role-Based Experience

| Role | Bottom Navigation Tabs | Primary Mobile Workflows |
|---|---|---|
| **Property Owner** | Home, Properties, Incidents, Workflows, Profile | View portfolio, report defect with photos, track 15-state workflow, view warranty |
| **Representative** | Home, Inspections, Defects, Profile | On-site inspections, record technical findings, defect assessments |
| **Service Provider** | Home, Jobs, Quotes, Profile | View assigned repair jobs, submit itemized quotes, update work orders |
| **Manager / Admin** | Home, Workflows, Providers, Profile | Review AI maintenance proposals, human approval (Approve / Reject / Revise) |

---

## 🔐 Security & AI Boundary Rule

1. **Authoritative Backend:** All state transitions and permissions are verified by ASP.NET Core.
2. **AI Boundary:** Flutter never invokes the AI service directly; all agent plans and recommendation summaries are synthesized by ASP.NET Core.
3. **No Hardcoded Secrets:** JWT tokens are securely persisted in local device storage and sent via `Authorization: Bearer <token>`.
