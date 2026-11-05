#!/bin/sh
set -eu

load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  eval "secret_file=\${$file_variable_name:-}"

  if [ -n "$secret_file" ]; then
    if [ ! -r "$secret_file" ]; then
      echo "Secret file for $variable_name is not readable" >&2
      exit 1
    fi
    secret_value=$(cat "$secret_file")
    export "$variable_name=$secret_value"
  fi
}

load_secret DATABASE_URL
load_secret ADMIN_PASSWORD
load_secret ADMIN_SESSION_SECRET
load_secret INTERNAL_API_KEY
load_secret R2_ACCESS_KEY
load_secret R2_SECRET_KEY
load_secret SMTP_PASSWORD

exec "$@"
