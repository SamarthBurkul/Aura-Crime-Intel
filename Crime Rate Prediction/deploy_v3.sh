#!/usr/bin/env bash
# deploy_v3.sh
# ─────────────────────────────────────────────────────────────────
# Promotion script: backs up existing models, deploys V3 bundle,
# restarts service, and runs a smoke test.
#
# Usage:
#   chmod +x deploy_v3.sh
#   APP_DIR=/var/www/crime-app MODEL_DIR=/srv/models ./deploy_v3.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/crime-app}"
MODEL_DIR="${MODEL_DIR:-/srv/models}"
ARCHIVE_DIR="$MODEL_DIR/archive"
SERVICE_NAME="${SERVICE_NAME:-crime-demo.service}"
RELEASE_DIR="${RELEASE_DIR:-/tmp/model_release_v3}"

echo "=== [1/6] Creating archive directory ==="
sudo mkdir -p "$ARCHIVE_DIR"

echo "=== [2/6] Backing up existing production models ==="
STAMP=$(date +%Y%m%d_%H%M)
sudo cp "$MODEL_DIR/model.pkl"            "$ARCHIVE_DIR/model_v1_${STAMP}.pkl"  || true
sudo cp "$MODEL_DIR/model_v2.pkl"         "$ARCHIVE_DIR/model_v2_${STAMP}.pkl"  || true
sudo cp "$MODEL_DIR/model_combined_v3.pkl"  "$ARCHIVE_DIR/model_combined_v3_${STAMP}.pkl" || true
echo "    Backup complete → $ARCHIVE_DIR"

echo "=== [3/6] Copying new model and meta into place ==="
sudo cp "$RELEASE_DIR/model/model_combined_v3.pkl"       "$MODEL_DIR/model.pkl"
sudo cp "$RELEASE_DIR/model/model_combined_v3_meta.json" "$MODEL_DIR/model_meta.json"
echo "    Model files updated"

echo "=== [4/6] Deploying application files ==="
sudo cp -r "$RELEASE_DIR/app/"* "$APP_DIR/"    # adjust source path as required
sudo chown -R www-data:www-data "$APP_DIR" \
     "$MODEL_DIR/model.pkl" "$MODEL_DIR/model_meta.json"
sudo chmod 640 "$MODEL_DIR/model.pkl" "$MODEL_DIR/model_meta.json"
echo "    App files deployed with correct ownership"

echo "=== [5/6] Restarting service: $SERVICE_NAME ==="
sudo systemctl restart "$SERVICE_NAME"
sleep 3
sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager

echo "=== [6/6] Smoke test ==="
curl -sf -X POST "http://localhost:5000/api/predict" \
     -H "Content-Type: application/json" \
     -d '{"city":"2","crime":"9","year":2025}' | python3 -m json.tool

echo ""
echo "✅  V3 deployment complete."
echo "    To rollback: sudo cp $ARCHIVE_DIR/model_v1_${STAMP}.pkl $MODEL_DIR/model.pkl"
echo "                 sudo systemctl restart $SERVICE_NAME"
