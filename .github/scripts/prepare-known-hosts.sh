#!/usr/bin/env bash
set -euo pipefail

output_path="${1:?Pass the known_hosts output path}"
: "${DEPLOY_HOST:?Set DEPLOY_HOST}"
: "${DEPLOY_KNOWN_HOSTS:?Set DEPLOY_KNOWN_HOSTS}"

fail() {
  printf '::error::DEPLOY_KNOWN_HOSTS %s\n' "$1" >&2
  exit 1
}

if printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | grep -Eq '^[[:space:]]*([0-9]+[[:space:]]+)?SHA256:'; then
  fail 'contains a fingerprint. Paste the server public host key or a complete known_hosts record; see README.'
fi

temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT

# A server public key has no hostname. Bind it to the configured deployment host.
# Preserve complete records, including hashed hostnames and OpenSSH markers.
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' | awk -v host="$DEPLOY_HOST" '
  $1 == "ssh-ed25519" || $1 == "ssh-rsa" ||
  $1 ~ /^ecdsa-sha2-nistp(256|384|521)$/ ||
  $1 == "sk-ssh-ed25519@openssh.com" || $1 == "sk-ecdsa-sha2-nistp256@openssh.com" {
    print host, $1, $2
    next
  }
  { print }
' > "$temporary_dir/known_hosts"

if ! ssh-keygen -l -f "$temporary_dir/known_hosts" >/dev/null 2>&1; then
  fail 'is not a valid SSH public key or known_hosts record. Paste actual key text, not a file path or fingerprint.'
fi
if ! ssh-keygen -F "$DEPLOY_HOST" -f "$temporary_dir/known_hosts" > "$temporary_dir/matches" 2>/dev/null; then
  fail 'does not match DEPLOY_HOST. Use the same IP/domain or paste the verified server public host key without a hostname.'
fi
if ! ssh-keygen -l -f "$temporary_dir/matches" >/dev/null 2>&1; then
  fail 'contains no valid SSH public key for DEPLOY_HOST.'
fi

install -m 600 "$temporary_dir/known_hosts" "$output_path"
