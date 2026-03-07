═══════════════════════════════════════════════════════════════════════
  INVESTMENT PORTFOLIO MANAGEMENT SYSTEM - FIRST TIME SETUP GUIDE
═══════════════════════════════════════════════════════════════════════

Version: 1.0
Last Updated: February 28, 2026
System Type: Cloud-Synced Portfolio Management Web Application

═══════════════════════════════════════════════════════════════════════
  TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════════════

1. Overview
2. System Requirements
3. First-Time Setup (Primary Device)
4. Connecting to Existing Data (New Device)
5. Supported Cloud Storage Providers
6. Browser Compatibility
7. Data Folder Structure
8. Multi-Device Usage Guidelines
9. Troubleshooting
10. Data Backup & Security
11. Frequently Asked Questions

═══════════════════════════════════════════════════════════════════════
  1. OVERVIEW
═══════════════════════════════════════════════════════════════════════

This Investment Portfolio Management System allows you to:
✓ Manage multiple investment portfolios
✓ Track assets across THB and USD currencies
✓ Access your data on ANY device (desktop, laptop, tablet)
✓ Sync data automatically via cloud storage (Google Drive, OneDrive)
✓ Work offline and sync when reconnected

IMPORTANT: This system uses FILE-BASED storage, not traditional databases.
Your portfolio data is stored in JSON files within a cloud storage folder
that you select. This enables true multi-device synchronization without
requiring a backend server or subscription fees.

═══════════════════════════════════════════════════════════════════════
  2. SYSTEM REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

REQUIRED:
• Modern web browser (see section 6 for compatibility)
• Cloud storage account (Google Drive, OneDrive, Dropbox, etc.)
• Cloud storage desktop sync application installed
• Internet connection (for initial setup and price updates)

RECOMMENDED:
• Google Chrome 86+ or Microsoft Edge 86+ (best compatibility)
• At least 50MB free space in cloud storage
• Desktop/laptop computer for initial setup (mobile support limited)

═══════════════════════════════════════════════════════════════════════
  3. FIRST-TIME SETUP (PRIMARY DEVICE)
═══════════════════════════════════════════════════════════════════════

Follow these steps on your PRIMARY device (where you'll create data first):

STEP 1: PREPARE CLOUD STORAGE FOLDER
─────────────────────────────────────
1. Open your cloud storage application (Google Drive Desktop, OneDrive, etc.)
2. Create a new folder for this application
   Recommended names:
   • "Portfolio_Manager"
   • "Investment_Data"
   • "MyPortfolios"
3. Wait for folder to sync to cloud (check sync status icon)

STEP 2: PLACE APPLICATION FILES
────────────────────────────────
1. Copy all application files to the cloud folder you created:
   - index.html
   - app.js
   - styles.css
   - [any other application files]

2. Your folder structure should look like:
   Portfolio_Manager/
   ├── index.html
   ├── app.js
   ├── styles.css
   └── [other files]

STEP 3: LAUNCH APPLICATION
───────────────────────────
1. Open your web browser (Chrome or Edge recommended)
2. Navigate to the cloud folder
3. Double-click "index.html" to open in browser
   OR
   Right-click "index.html" → Open With → Chrome/Edge

STEP 4: SELECT DATA FOLDER
───────────────────────────
On first launch, you'll see a popup:

   ┌─────────────────────────────────────────┐
   │  Cloud Storage Setup                    │
   ├─────────────────────────────────────────┤
   │  This app stores data in JSON files     │
   │  in your cloud storage for multi-device │
   │  synchronization.                       │
   │                                         │
   │  Please select the folder where this    │
   │  application is located.                │
   │                                         │
   │  [Select Folder] [Use Local Storage]   │
   └─────────────────────────────────────────┘

1. Click "Select Folder"
2. Browser will show folder picker dialog
3. Navigate to your cloud folder (Portfolio_Manager)
4. Click "Select" or "Choose"

STEP 5: GRANT PERMISSION
─────────────────────────
Browser will ask for permission:

   "Allow index.html to view files in Portfolio_Manager?"
   
   [Block]  [Allow]

1. Click "Allow"
2. App will create a "data" subfolder automatically:
   
   Portfolio_Manager/
   ├── index.html
   ├── app.js
   ├── styles.css
   └── data/                    ← Created automatically
       ├── portfolios.json
       ├── accounts.json
       ├── investments.json
       └── [other data files]

STEP 6: START USING THE APP
────────────────────────────
✓ You're all set! The app is now ready to use.
✓ All data you create will be saved to JSON files in data/ folder
✓ Cloud storage will sync these files automatically
✓ You can now access this data from other devices (see section 4)

═══════════════════════════════════════════════════════════════════════
  4. CONNECTING TO EXISTING DATA (NEW DEVICE)
═══════════════════════════════════════════════════════════════════════

To access your portfolio data on a NEW device (laptop, desktop, etc.):

PREREQUISITE:
✓ Cloud storage app installed on new device
✓ Logged in with same account
✓ Portfolio_Manager folder synced to new device
✓ All files visible in local cloud folder

STEP 1: VERIFY FOLDER SYNC
───────────────────────────
1. Open cloud storage folder on new device
2. Navigate to Portfolio_Manager folder
3. Verify you see:
   Portfolio_Manager/
   ├── index.html
   ├── app.js
   ├── styles.css
   └── data/
       ├── portfolios.json      ← Your data is here!
       ├── accounts.json
       └── [other files]

4. If data/ folder is empty or missing, wait for cloud sync to complete

STEP 2: OPEN APPLICATION
─────────────────────────
1. Open web browser (Chrome or Edge recommended)
2. Navigate to Portfolio_Manager folder
3. Double-click index.html

STEP 3: SELECT SAME DATA FOLDER
────────────────────────────────
On first launch on new device, you'll see the setup popup again:

1. Click "Select Folder"
2. Navigate to the SAME Portfolio_Manager folder
3. Click "Select"
4. Click "Allow" when browser asks for permission

STEP 4: DATA AUTOMATICALLY LOADS
─────────────────────────────────
✓ App detects existing data/ folder
✓ Loads all your portfolios, accounts, transactions
✓ You now have access to all your data on this device!

STEP 5: TEST SYNCHRONIZATION
─────────────────────────────
1. Make a small change (e.g., rename a portfolio)
2. Wait 5-10 seconds for cloud sync
3. Open app on original device
4. Refresh browser (F5)
5. Change should appear! ✓

═══════════════════════════════════════════════════════════════════════
  5. SUPPORTED CLOUD STORAGE PROVIDERS
═══════════════════════════════════════════════════════════════════════

TESTED & RECOMMENDED:
✓ Google Drive Desktop (Windows/Mac)
✓ OneDrive (Windows/Mac)
✓ Dropbox Desktop (Windows/Mac)
✓ iCloud Drive (Mac only)

SHOULD WORK (not officially tested):
• Box Drive
• pCloud
• Sync.com
• Any folder synced by cloud service

REQUIREMENTS FOR CLOUD PROVIDER:
• Two-way sync (upload and download)
• Desktop sync application available
• Supports syncing to local filesystem
• Sub-folder creation allowed

NOT SUPPORTED:
✗ Cloud web interfaces (drive.google.com in browser)
✗ Mobile-only cloud apps
✗ Read-only network drives

═══════════════════════════════════════════════════════════════════════
  6. BROWSER COMPATIBILITY
═══════════════════════════════════════════════════════════════════════

FULL SUPPORT (Recommended):
✓✓✓ Google Chrome 86+ (Windows, Mac, Linux)
✓✓✓ Microsoft Edge 86+ (Windows, Mac)
✓✓  Opera 72+ (Windows, Mac, Linux)

PARTIAL SUPPORT:
⚠️  Safari 15.2+ (Mac only - limited File System API support)
    • May require manual export/import for sync
    • Some features may not work

NO SUPPORT:
✗  Firefox (File System Access API not implemented)
   → Will fallback to localStorage + manual export/import
✗  Internet Explorer (obsolete browser)
✗  Mobile browsers (Chrome Mobile, Safari iOS)
   → Use mobile fallback mode (coming soon)

HOW TO CHECK YOUR BROWSER:
1. Open app in browser
2. Check bottom left corner for compatibility status:
   🟢 "Cloud Sync: Active" = Full support
   🟡 "Cloud Sync: Limited" = Partial support
   🔴 "Local Storage Only" = No File API support

═══════════════════════════════════════════════════════════════════════
  7. DATA FOLDER STRUCTURE
═══════════════════════════════════════════════════════════════════════

After setup, your folder structure will be:

Portfolio_Manager/               ← Your cloud folder
├── index.html                   ← Application files
├── app.js
├── styles.css
│
└── data/                        ← DATA FOLDER (auto-created)
    ├── portfolios.json          ← Your portfolios
    ├── accounts.json            ← THB/FCD accounts
    ├── investments.json         ← Transaction history
    ├── deposits.json            ← Deposit records
    ├── assetPrices.json         ← Current prices
    ├── investmentPlans.json     ← DCA plans
    ├── positions.json           ← Asset positions
    ├── conversionRates.json     ← FX rates
    └── metadata.json            ← Sync information

FILE DESCRIPTIONS:
• portfolios.json - All your portfolio configurations and allocations
• accounts.json - THB Savings and FCD account balances
• investments.json - Complete transaction history
• assetPrices.json - Latest fetched prices for all assets
• metadata.json - Last sync time, device info, checksums

IMPORTANT NOTES:
• DO NOT manually edit JSON files (corruption risk)
• DO NOT delete data/ folder (all data will be lost)
• DO backup data/ folder regularly (see section 10)
• Files are plain text JSON (human-readable)

═══════════════════════════════════════════════════════════════════════
  8. MULTI-DEVICE USAGE GUIDELINES
═══════════════════════════════════════════════════════════════════════

BEST PRACTICES:
✓ Close app on one device before using on another
✓ Wait 10-15 seconds after saving for cloud sync
✓ Refresh browser (F5) when switching between devices
✓ Check sync status before making important changes

AVOID:
✗ Using app on 2 devices simultaneously (data conflicts)
✗ Making changes while cloud sync is in progress
✗ Editing JSON files manually while app is open

DATA CONFLICT RESOLUTION:
If you accidentally use 2 devices at once:

1. Close app on both devices
2. Wait for cloud sync to complete
3. Check file timestamps in data/ folder
4. Backup both versions if needed
5. Open app on one device
6. Verify data integrity
7. If conflict detected, app will show:
   
   ┌─────────────────────────────────────────┐
   │  ⚠️  Data Conflict Detected             │
   ├─────────────────────────────────────────┤
   │  Cloud data modified on another device  │
   │  Local data:  2026-02-28 14:30:00      │
   │  Cloud data:  2026-02-28 14:35:00      │
   │                                         │
   │  [Use Cloud Data] [Use Local Data]     │
   │  [View Differences]                    │
   └─────────────────────────────────────────┘

SYNC STATUS INDICATORS:
🟢 Synced - Data is up to date
🟡 Syncing - Save in progress, wait before closing
🔴 Conflict - Manual resolution needed
⚫ Offline - Using cached data, will sync when online

═══════════════════════════════════════════════════════════════════════
  9. TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════

PROBLEM: "Permission denied" error
SOLUTION:
  1. Browser blocked folder access
  2. Click "Settings" → "Site Settings" → "Permissions"
  3. Find folder permission, click "Reset"
  4. Reload app and grant permission again

PROBLEM: Data not syncing between devices
SOLUTION:
  1. Check cloud sync status (icon in system tray)
  2. Verify internet connection on both devices
  3. Open cloud folder, verify data/ files are present
  4. Force sync: Right-click folder → "Sync Now"
  5. Wait 1-2 minutes, refresh browser on other device

PROBLEM: "Failed to load data" error
SOLUTION:
  1. Check if data/ folder exists
  2. Verify JSON files are not corrupted
  3. Try: Settings → "Repair Data Files"
  4. If unsuccessful, restore from backup

PROBLEM: Changes lost after closing app
SOLUTION:
  1. Verify you selected correct folder during setup
  2. Check if cloud sync is active (system tray icon)
  3. Ensure you granted "Allow" permission
  4. Try: Settings → "Reconnect Data Folder"

PROBLEM: Browser not supported (Firefox, Safari)
SOLUTION:
  1. App will automatically use Local Storage mode
  2. Data saved to browser only (no multi-device sync)
  3. Use manual Export/Import for sync:
     • Device 1: Settings → Export All Data → Save to cloud folder
     • Device 2: Settings → Import Data → Select exported file
  4. OR: Use Chrome/Edge for full cloud sync support

PROBLEM: Slow performance with large data
SOLUTION:
  1. Archive old transactions (Export → Delete old data)
  2. Keep only recent 2-3 years of data
  3. Use yearly exports for tax records
  4. Optimize: Settings → "Optimize Database"

═══════════════════════════════════════════════════════════════════════
  10. DATA BACKUP & SECURITY
═══════════════════════════════════════════════════════════════════════

AUTOMATIC BACKUPS (Cloud Storage):
• Cloud providers keep file version history
• Google Drive: 30 days of versions
• OneDrive: 30 days of versions
• Dropbox: 30 days (free), 180 days (paid)

TO RESTORE FROM CLOUD VERSION:
1. Right-click JSON file in cloud folder
2. Select "Version history" or "Previous versions"
3. Choose date/time to restore
4. Restore file

MANUAL BACKUP METHODS:

Method 1: Export All Data (Recommended)
1. Open app → Settings → "Export All Data"
2. Save file: portfolio_backup_2026-02-28.json
3. Store in separate location (external drive, email, etc.)
4. Schedule: Weekly or before major changes

Method 2: Copy data/ Folder
1. Close application
2. Navigate to Portfolio_Manager/data/
3. Copy entire data/ folder
4. Paste to backup location
5. Label with date: data_backup_2026-02-28/

Method 3: Export to Excel
1. Open app → Reports → "Export to Excel"
2. Saves readable backup of transactions
3. Useful for tax records and auditing

SECURITY CONSIDERATIONS:

⚠️  IMPORTANT: JSON files are NOT encrypted!
• Data stored as plain text
• Anyone with access to folder can read files
• Relies on cloud storage account security

RECOMMENDATIONS:
✓ Use strong password for cloud storage account
✓ Enable 2-factor authentication on cloud account
✓ Don't share cloud folder publicly
✓ Review cloud sharing settings regularly
✓ Consider encrypting sensitive notes/comments

OPTIONAL: Enable encryption (advanced users)
• App can encrypt data files (AES-256)
• Settings → Security → "Enable Encryption"
• Set encryption password (DON'T FORGET IT!)
• Encrypted files unreadable without password

═══════════════════════════════════════════════════════════════════════
  11. FREQUENTLY ASKED QUESTIONS
═══════════════════════════════════════════════════════════════════════

Q: Can I use this on mobile devices?
A: Limited support. Mobile browsers don't support File System Access API
   yet. Use export/import method or wait for mobile-optimized version.

Q: Do I need internet connection to use?
A: No for basic use. Yes for:
   • Initial setup
   • Fetching current asset prices
   • Syncing across devices
   App works offline and syncs when reconnected.

Q: How much cloud storage space needed?
A: Typically 5-50 MB depending on data volume:
   • Small portfolio: 1-5 MB
   • Medium portfolio: 5-20 MB
   • Large portfolio with 5+ years history: 20-50 MB

Q: Can multiple users share the same cloud folder?
A: Not recommended. Each user should have their own folder.
   Multi-user access may cause data conflicts.

Q: What happens if I delete a JSON file accidentally?
A: Data in that file is lost unless you have backup.
   Restore from cloud version history or manual backup.

Q: Can I move the cloud folder to different location?
A: Yes, but you must:
   1. Move folder using cloud app
   2. Wait for sync to complete
   3. Open app, click "Reconnect Data Folder"
   4. Select new folder location

Q: Is my financial data sent to any servers?
A: No! All data stays on your device and your cloud storage.
   Only asset price APIs are called (Yahoo Finance, etc.)
   No user data is transmitted except price lookups.

Q: Can I use without cloud storage (offline only)?
A: Yes. On setup screen, click "Use Local Storage" instead.
   Data saved to browser only (no multi-device sync).
   Use manual export/import to transfer data.

═══════════════════════════════════════════════════════════════════════
  NEED HELP?
═══════════════════════════════════════════════════════════════════════

For technical issues:
• Check troubleshooting section above
• Verify browser compatibility
• Ensure cloud sync is working

For feature requests or bug reports:
• Use app's feedback form (Settings → "Send Feedback")
• Or report via [your support channel]

═══════════════════════════════════════════════════════════════════════
  VERSION HISTORY
═══════════════════════════════════════════════════════════════════════

Version 1.0 (February 28, 2026)
• Initial release
• Cloud storage synchronization
• Multi-device support
• File System Access API integration

═══════════════════════════════════════════════════════════════════════
  END OF SETUP GUIDE
═══════════════════════════════════════════════════════════════════════

Thank you for using Investment Portfolio Management System!