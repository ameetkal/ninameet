# Firebase Setup Guide for Nina & Ameet Wedding Website

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Enter project name: `ninameet-wedding` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In your Firebase project dashboard, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select a location closest to your users (e.g., `us-central1` for US)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In your Firebase project dashboard, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Register your app with nickname: `ninameet-wedding-web`
6. Check "Also set up Firebase Hosting" if you want (optional)
7. Click "Register app"
8. Copy the Firebase configuration object

## Step 4: Update Your Website Configuration

Replace the placeholder config in `index.html` with your actual Firebase config:

```javascript
// Replace this section in index.html:
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## Step 5: Set up Firestore Security Rules (Optional but Recommended)

1. In Firestore Database, go to "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow writes to wedding-responses collection
    match /wedding-responses/{document} {
      allow create: if true;
      allow read, update, delete: if false; // Only allow creation, not reading/updating
    }
  }
}
```

3. Click "Publish"

## Step 6: Test the Integration

1. Deploy your updated website
2. Test form submission
3. Check Firestore console to see if data appears in the `wedding-responses` collection

## Step 7: View Your Data

1. Go to Firestore Database in Firebase Console
2. You should see a `wedding-responses` collection with submitted responses
3. Each document will contain:
   - `fullName`: Guest's full name
   - `email`: Guest's email address
   - `response`: Their response (Planning to come! or Can't make it)
   - `question`: Their wisdom/question for you
   - `timestamp`: Server timestamp
   - `createdAt`: Client timestamp (fallback)

## Benefits of Firebase over Google Sheets

- **Real-time**: Data appears instantly
- **Scalable**: Can handle many simultaneous submissions
- **Secure**: Proper authentication and security rules
- **Structured**: Better data organization and querying
- **Backup**: Built-in redundancy and reliability
- **Analytics**: Can add Firebase Analytics for insights

## Troubleshooting

- If you see "Firebase not initialized" error, double-check your config values
- If submissions fail, check browser console for detailed error messages
- Data is still saved locally as backup even if Firebase fails
- Test in incognito mode to ensure it works for guests without login

## Next Steps (Optional)

- Set up Firebase Authentication if you want to restrict access
- Add Firebase Analytics to track usage
- Use Firebase Functions for server-side processing
- Set up email notifications when new responses arrive 