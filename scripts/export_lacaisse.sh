#!/bin/bash

# LaCaisse.ma Export Script
# Usage: ./export_lacaisse.sh [start_date] [end_date] [output_file] [report_type]
# Date format: MM/DD/YYYY (e.g., 01/01/2026)

# ============================================
# CONFIGURATION - Your account credentials
# ============================================
# You can also set these as environment variables:
# export LACAISSE_LOGIN="your@email.com"
# export LACAISSE_PASSWORD="yourpassword"

LOGIN="${LACAISSE_LOGIN:-epictete@lacaisse.ma}"
PASSWORD="${LACAISSE_PASSWORD:-BIUAUUQ1}"

AUTH_API="https://apiv2.lacaisse.ma/api/v1/auth"
BASE_URL="https://api-legacy.lacaisse.ma"

# ============================================
# AUTHENTICATE - Get fresh token
# ============================================
echo "🔐 Authenticating..."

AUTH_RESPONSE=$(curl -s -X POST "$AUTH_API" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")

# Extract token_api (licence) from response
TOKEN_API=$(echo "$AUTH_RESPONSE" | grep -o '"licence":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN_API" ]; then
    echo "❌ Authentication failed!"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authenticated! Token: ${TOKEN_API:0:20}..."

# Get caisse ID from the auth response or use default
# The caisse ID is tied to your account
CAISSE_ID="3349"

# ============================================
# Export endpoints mapping
# ============================================
# 1  = RAPPORT DÉTAILLÉ DES VENTES (VENTES)     -> export_excel.php
# 7  = RAPPORT JOURNALIER DES VENTES            -> export_excel_ventejournalier.php
# 36 = RÉPARTITION DES VENTES PAR FAMILLE       -> export_excel_ventefamille.php
# 5  = RÉPARTITION DES VENTES PAR CATÉGORIE     -> export_excel_ventecategorie.php
# 6  = RÉPARTITION DES VENTES PAR PRODUITS      -> export_excel_venteproduit.php
# 20 = RAPPORT DÉTAILLÉ DES ANNULATIONS         -> export_excel_annulation.php
# 38 = RAPPORT DES VENTES PAR TICKET            -> export_excel_venteticket.php
# 4  = RÉPARTITION PAR MOYEN DE PAIEMENT        -> export_excel_paiement.php
# 2  = VENTES JOURNALIÈRES PAR MOYEN PAIEMENT   -> export_excel_moyenpaiement.php

# Default values
START_DATE="${1:-01/01/2026}"
END_DATE="${2:-01/31/2026}"
OUTPUT_FILE="${3:-rapport_ventes_$(date +%Y%m%d_%H%M%S).xlsx}"
REPORT_TYPE="${4:-1}"

# Map report type to endpoint
case $REPORT_TYPE in
    1)  ENDPOINT="export_excel.php" ;;
    7)  ENDPOINT="export_excel_ventejournalier.php" ;;
    36) ENDPOINT="export_excel_ventefamille.php" ;;
    5)  ENDPOINT="export_excel_ventecategorie.php" ;;
    6)  ENDPOINT="export_excel_venteproduit.php" ;;
    20) ENDPOINT="export_excel_annulation.php" ;;
    38) ENDPOINT="export_excel_venteticket.php" ;;
    4)  ENDPOINT="export_excel_paiement.php" ;;
    2)  ENDPOINT="export_excel_moyenpaiement.php" ;;
    *)  ENDPOINT="export_excel.php" ;;
esac

echo "============================================"
echo "LaCaisse.ma Export"
echo "============================================"
echo "Caisse ID:   $CAISSE_ID"
echo "Start Date:  $START_DATE"
echo "End Date:    $END_DATE"
echo "Report Type: $REPORT_TYPE ($ENDPOINT)"
echo "Output:      $OUTPUT_FILE"
echo "============================================"

# Build URL
URL="${BASE_URL}/${ENDPOINT}?caisse=${CAISSE_ID}&startDate=${START_DATE}&endDate=${END_DATE}&token_api=${TOKEN_API}&idcaisselist=${CAISSE_ID}"

echo "Fetching data..."
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$OUTPUT_FILE" "$URL")

if [ "$HTTP_CODE" == "200" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    FILE_TYPE=$(file "$OUTPUT_FILE" | cut -d: -f2)
    echo "✅ Success! Downloaded: $OUTPUT_FILE ($FILE_SIZE)"
    echo "   File type:$FILE_TYPE"
else
    echo "❌ Error: HTTP $HTTP_CODE"
    cat "$OUTPUT_FILE"
    rm -f "$OUTPUT_FILE"
fi
