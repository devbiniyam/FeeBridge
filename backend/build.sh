#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static files with whitenoise compression
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate --no-input

# Seed demo and initial admin accounts (safe and idempotent)
python manage.py seed_demo_data
