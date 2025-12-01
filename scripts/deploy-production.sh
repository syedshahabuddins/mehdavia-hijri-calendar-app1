#!/bin/bash
# Production Deployment Guide
# 
# This script provides step-by-step instructions for deploying the Hijri Calendar App
# to Firebase production environment.
#
# Before running this script, ensure you have:
# 1. Node.js 18+ installed
# 2. Firebase CLI installed: npm install -g firebase-tools
# 3. A Firebase project created in Google Cloud Console
# 4. Google Sign-In enabled in Firebase Authentication
# 5. Firestore Database enabled
# 6. Firebase CLI authenticated: firebase login

echo "=========================================="
echo "  Hijri Calendar App - Production Deploy"
echo "=========================================="
echo ""

# Step 1: Check prerequisites
echo "Step 1: Checking Prerequisites..."
echo ""

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi
echo "✓ Node.js version: $(node -v)"

if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
  exit 1
fi
echo "✓ Firebase CLI installed"

# Step 2: Check Firebase authentication
echo ""
echo "Step 2: Checking Firebase CLI Authentication..."
if ! firebase projects:list &> /dev/null; then
  echo "❌ Firebase CLI not authenticated"
  echo "   Run: firebase login"
  exit 1
fi
echo "✓ Firebase CLI authenticated"

# Step 3: List available projects
echo ""
echo "Step 3: Available Firebase Projects:"
firebase projects:list --json | python3 -m json.tool 2>/dev/null || firebase projects:list

# Step 4: Select or create project
echo ""
echo "Step 4: Firebase Project Setup"
echo ""
CURRENT_PROJECT=$(firebase projects:list --json 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['projectId'] if data else 'none')" 2>/dev/null || echo "none")

if [ "$CURRENT_PROJECT" != "none" ]; then
  echo "Current default project: $CURRENT_PROJECT"
  read -p "Use this project for deployment? (y/n): " use_current
  if [ "$use_current" != "y" ]; then
    echo "Run 'firebase use --add' to select a different project"
    exit 1
  fi
else
  echo "No project selected. Run 'firebase use --add' to link your project"
  exit 1
fi

# Step 5: Verify Firebase config file
echo ""
echo "Step 5: Verifying Firebase Configuration..."
if [ ! -f "firebase.json" ]; then
  echo "❌ firebase.json not found"
  exit 1
fi
echo "✓ firebase.json found"

if [ ! -f ".firebaserc" ]; then
  echo "❌ .firebaserc not found"
  exit 1
fi
echo "✓ .firebaserc found"

# Step 6: Verify functions dependencies
echo ""
echo "Step 6: Installing Cloud Functions Dependencies..."
if [ ! -d "functions/node_modules" ]; then
  echo "Installing npm packages in functions/"
  cd functions && npm install --no-audit --no-fund && cd ..
  echo "✓ Dependencies installed"
else
  echo "✓ Functions dependencies already installed"
fi

# Step 7: Display Firestore rules
echo ""
echo "Step 7: Firestore Security Rules Preview"
echo "   Location: firestore.rules"
echo "   Security features:"
echo "   - Users cannot write 'role' or 'adminId' fields"
echo "   - Only authenticated users can read documents"
echo "   - Admins can create events for their managed users"
echo "   - Announcements require admin or master_admin claim"
echo ""
read -p "Proceed with deployment? (y/n): " proceed
if [ "$proceed" != "y" ]; then
  echo "Deployment cancelled"
  exit 1
fi

# Step 8: Deploy
echo ""
echo "Step 8: Deploying to Firebase..."
echo ""

firebase deploy --only functions,firestore:rules

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "  ✓ Deployment Successful!"
  echo "=========================================="
  echo ""
  echo "Next Steps:"
  echo ""
  echo "1. Set Master Admin User (via Firebase Console):"
  echo "   - Go to Firebase Console → Authentication → Users"
  echo "   - Select your master admin user"
  echo "   - Set custom claims JSON:"
  echo "     { \"master_admin\": true, \"admin\": false }"
  echo ""
  echo "2. Update Frontend Firebase Config:"
  echo "   - Edit js/firebase-config.js with your production config"
  echo "   - Replace placeholders with your project credentials"
  echo ""
  echo "3. Deploy Static Files (Optional - for Firebase Hosting):"
  echo "   - Run: firebase init hosting"
  echo "   - Run: firebase deploy"
  echo ""
  echo "4. Test Production Deployment:"
  echo "   - Open your Firebase Hosting URL or point domain to your app"
  echo "   - Sign in with Google"
  echo "   - Test features: calendar, events, announcements, prayer times"
  echo ""
  echo "Documentation: See README.md for complete feature list and usage"
  echo ""
else
  echo ""
  echo "❌ Deployment failed. Check errors above."
  exit 1
fi
