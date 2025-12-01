#!/bin/bash
# Firestore Rules Validation Tests
# Validates that rules properly enforce access control for role/adminId fields
# 
# Prerequisites: Firebase Emulator Suite running (auth:9099, firestore:8080)
# Usage: bash scripts/test-rules.sh

set -e

FIRESTORE="http://127.0.0.1:8080"
AUTH="http://127.0.0.1:9099"
PROJECT="demo-project"

passed=0
failed=0

test_count=0
pass_count=0
fail_count=0

echo "=========================================="
echo "  Firestore Rules Validation Tests"
echo "=========================================="
echo ""

# Test 1: User can create their own user doc
test_count=$((test_count + 1))
echo "Test 1: User can create own user doc"
EMAIL="roletest$(date +%s)@test.com"
USER_JSON=$(curl -s "$AUTH/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test" \
  -d '{"email":"'$EMAIL'","password":"TestPass123","returnSecureToken":true}' \
  -H 'content-type: application/json')

USERID=$(echo "$USER_JSON" | grep -o '"localId":"[^"]*' | head -1 | cut -d'"' -f4)
TOKEN=$(echo "$USER_JSON" | grep -o '"idToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$USERID" ] || [ -z "$TOKEN" ]; then
  echo "✗ FAIL: Could not create user/get token"
  fail_count=$((fail_count + 1))
else
  CREATE=$(curl -s -X POST "$FIRESTORE/v1/projects/$PROJECT/databases/(default)/documents/users?documentId=$USERID" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"fields":{"email":{"stringValue":"'$EMAIL'"},"role":{"stringValue":"user"}}}')
  
  if echo "$CREATE" | grep -q '"name"'; then
    echo "✓ PASS"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL: $(echo $CREATE | head -c 100)"
    fail_count=$((fail_count + 1))
  fi
fi
echo ""

# Test 2: User CANNOT modify role field via PATCH (should be PERMISSION_DENIED)
test_count=$((test_count + 1))
echo "Test 2: User cannot write role field in own doc (PATCH)"
if [ -z "$USERID" ] || [ -z "$TOKEN" ]; then
  echo "⊘ SKIP: No valid user/token"
else
  PATCH=$(curl -s -X PATCH "$FIRESTORE/v1/projects/$PROJECT/databases/(default)/documents/users/$USERID" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"fields":{"role":{"stringValue":"admin"}}}')
  
  if echo "$PATCH" | grep -q 'PERMISSION_DENIED'; then
    echo "✓ PASS (role write denied with PERMISSION_DENIED)"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL: role field modification was allowed"
    echo "  Response: $(echo $PATCH | head -c 200)"
    fail_count=$((fail_count + 1))
  fi
fi
echo ""

# Test 3: User CANNOT modify adminId field via PATCH
test_count=$((test_count + 1))
echo "Test 3: User cannot write adminId field (PATCH)"
if [ -z "$USERID" ] || [ -z "$TOKEN" ]; then
  echo "⊘ SKIP: No valid user/token"
else
  PATCH=$(curl -s -X PATCH "$FIRESTORE/v1/projects/$PROJECT/databases/(default)/documents/users/$USERID" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"fields":{"adminId":{"stringValue":"someadmin"}}}')
  
  if echo "$PATCH" | grep -q 'PERMISSION_DENIED'; then
    echo "✓ PASS (adminId write denied)"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL: adminId field modification was allowed"
    fail_count=$((fail_count + 1))
  fi
fi
echo ""

# Test 4: User CAN update other fields (like displayName)
test_count=$((test_count + 1))
echo "Test 4: User CAN update other fields (displayName)"
if [ -z "$USERID" ] || [ -z "$TOKEN" ]; then
  echo "⊘ SKIP: No valid user/token"
else
  PATCH=$(curl -s -X PATCH "$FIRESTORE/v1/projects/$PROJECT/databases/(default)/documents/users/$USERID?updateMask.fieldPaths=displayName" \
    -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"fields":{"displayName":{"stringValue":"Test User"}}}')
  
  if echo "$PATCH" | grep -q '"name"'; then
    echo "✓ PASS (other fields updatable)"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL: Legitimate field update was blocked"
    fail_count=$((fail_count + 1))
  fi
fi
echo ""

echo "=========================================="
echo "Results: $pass_count passed, $fail_count failed"
echo "=========================================="

if [ $fail_count -gt 0 ]; then
  exit 1
fi
exit 0
