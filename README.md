# VyapaarPay - Premium Billing, Inventory, and Accounts SaaS Software

![VyapaarPay Suite](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20TailwindCSS%20%7C%20Kotlin-indigo?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)

VyapaarPay is an ultra-attractive, modern, and high-speed Billing, Inventory, and Khata Accounts management software designed for retail stores, supermarkets, and enterprise businesses. Built with a clean **Service-Oriented Architecture**, it seamlessly runs across Web, Windows Desktop, and Android mobile viewports.

---

## 🔑 Demo Login Credentials

You can test different security clearance levels using the following credentials:

| Role | Username / Login ID | Password | Access Clearance |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | *(None)* | Full clearance (Dashboard Analytics, Staff Management, POS, Inventory & Ledgers) |
| **Admin Manager** | `admin` | *(None)* | Manager clearance (Dashboard, POS Billing, Inventory Catalog, Khata Ledgers) |
| **Billing Staff** | `staff` | *(None)* | Counter billing clearance (Restricted strictly to POS Billing Screen) |

---

## ✨ Core Features

* **⚡ Keyboard-Optimized Retail POS:** Lightning fast billing interface with shortcut hotkeys (`F2` for New Bill, `F5` for Save & Print, `+` to focus search) and direct barcode scanner compatibility.
* **📊 Visual Analytics Dashboard:** Real-time revenue statistics, top-selling items, low stock warnings, and interactive SVG sales growth curves & profit/loss charts.
* **📦 Inventory Catalog Manager:** SKU and EAN Barcode auto-generation, purchase vs selling price calculations, and low stock visual indicator tags.
* **📖 Accounts & Khata Ledger:** Customer & Supplier profiles tracking double-entry credit history, partial payments, and balance statements.
* **🖨️ Thermal & A4 Receipt Engine:** Native printing integration supporting standard A4 corporate invoices and compact 80mm thermal receipts.

---

## 💻 1. Windows Installation & Setup Guide

### Local Development (Windows PowerShell)

1. **Clone the Repository:**
   ```powershell
   git clone https://github.com/faizy313786/Premium-Billing-Software.git
   cd Premium-Billing-Software
   ```

2. **Install Frontend Dependencies:**
   ```powershell
   npm install
   ```

3. **Run the React Frontend App:**
   ```powershell
   npm run dev
   ```
   *The web app will start at `http://localhost:5173`.*

4. **Run the Kotlin Backend Server (Optional for Real DB):**
   Open a separate PowerShell window, navigate to the backend directory, and execute:
   ```powershell
   cd C:\Users\faizy\.gemini\antigravity\scratch\premium-billing-backend
   .\gradlew.bat run
   ```
   *The Kotlin server will start at `http://localhost:8080`.*

### Packaging as a Windows Desktop Executable (.exe)

You can package this Web App into a native Windows `.exe` application using **Tauri** or **Electron**:

#### Option A: Using Tauri (Lightweight & Super Fast)
1. Install Tauri CLI: `npm install -D @tauri-apps/cli`
2. Initialize Tauri: `npx tauri init`
3. Build Windows Executable: `npx tauri build`
   *(Your executable installer will be generated in `src-tauri/target/release/bundle/msi/`)*.

#### Option B: Using Electron
1. Install Electron Packager: `npm install -D electron electron-packager`
2. Run build: `npx electron-packager . VyapaarPay --platform=win32 --arch=x64`

---

## 📱 2. Android Installation & Mobile Setup Guide

To package this application as a native Android App (`.apk`) and install it on mobile phones or POS Android handheld devices:

1. **Install Capacitor CLI:**
   ```powershell
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialize Capacitor in Project:**
   ```powershell
   npx cap init VyapaarPay com.vyapaarpay.app --web-dir dist
   ```

3. **Build Production Distribution Bundle:**
   ```powershell
   npm run build
   ```

4. **Add Android Platform & Open in Android Studio:**
   ```powershell
   npx cap add android
   npx cap copy
   npx cap open android
   ```

5. **Generate `.apk` File in Android Studio:**
   * In Android Studio, go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   * Transfer the generated `app-debug.apk` to any Android device and install.

---

## 🗄️ 3. Database Configuration Guide

The software supports **SQLite**, **PostgreSQL**, and **MySQL**. All SQL table structures, indices, and sample seeding data are provided in the repository.

### Database Setup Steps

1. **Locate SQL Schema Script:**
   The complete database initialization script is located at `database_schema.sql`.

2. **Execute Schema Queries:**
   Open your database management client (pgAdmin for PostgreSQL, MySQL Workbench, or DBeaver) and run the queries inside `database_schema.sql` to create the tables:
   * `users`
   * `products`
   * `contacts`
   * `invoices`
   * `invoice_items`
   * `ledger_transactions`

3. **Connecting Kotlin Backend to MySQL / PostgreSQL:**
   In the Kotlin Backend project (`premium-billing-backend`), open `DatabaseFactory.kt` and change the JDBC connection settings:

   ```kotlin
   // For PostgreSQL
   val jdbcUrl = "jdbc:postgresql://localhost:5432/vyapaarpay_db"
   val driverClassName = "org.postgresql.Driver"
   Database.connect(jdbcUrl, driverClassName, user = "postgres", password = "your_password")

   // For MySQL
   val jdbcUrl = "jdbc:mysql://localhost:3306/vyapaarpay_db"
   val driverClassName = "com.mysql.cj.jdbc.Driver"
   Database.connect(jdbcUrl, driverClassName, user = "root", password = "your_password")
   ```

---

## 📄 License
Distributed under the MIT License. Developed with ❤️ for enterprise billing management.
