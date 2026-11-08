#!/usr/bin/env bash
# Teste real do caminho WhatsApp (OpenWA) na VPS, sem imprimir segredo.
# 1) lista as integrações WhatsApp do tenant (só leitura no banco)
# 2) lista as sessões do OpenWA
# 3) cria uma sessão de teste, inicia, busca o QR e APAGA a sessão no fim
# Uso: bash teste-whatsapp-real.sh [subdominio]   (padrão: totum)
set -uo pipefail
SUB="${1:-totum}"
ENVF=/opt/upixel-supabase/functions.env

val() { grep -E "^$1=" "$ENVF" | head -1 | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//'; }
URL="$(val UPIXEL_WA_URL)"; KEY="$(val UPIXEL_WA_KEY)"; BASIC="$(val UPIXEL_WA_BASIC_AUTH)"
echo "== config: url=$URL key_len=${#KEY} basic_len=${#BASIC}"
H=(-H "X-API-Key: $KEY")
[ -n "$BASIC" ] && H+=(-u "$BASIC")

echo; echo "== 1. integrações WhatsApp do tenant '$SUB' (banco)"
docker exec -i upixel-db psql -U supabase_admin -d postgres -At -F' | ' <<SQL
select i.id, i.provider, coalesce(i.instance_name,'(vazio)'), i.config->>'instance_name', i.config->>'friendly_name',
       i.config->>'api_url', i.status, coalesce(i.health_status,''), coalesce(i.consecutive_failures,0)
from public.integrations i join public.tenants t on t.id = i.client_id
where t.subdomain = '$SUB' and i.provider in ('whatsapp','whatsapp_official')
order by i.created_at;
SQL

echo; echo "== 2. sessões no OpenWA"
curl -sS -m 20 "${H[@]}" "$URL/api/sessions" -w "\nHTTP %{http_code}\n" | python3 -c '
import sys, json
raw = sys.stdin.read(); body, _, code = raw.rpartition("\nHTTP ")
print("HTTP", code.strip())
try:
    data = json.loads(body); items = data if isinstance(data, list) else data.get("data") or data.get("sessions") or []
    for s in items: print(" ", s.get("id"), "|", s.get("name"), "|", s.get("status"), "|", s.get("phone"))
except Exception: print(body[:300])
'

echo; echo "== 3. ciclo de criação (sessão de teste, apagada no fim)"
NAME="upixel-teste-$(date +%s)"
CREATE=$(curl -sS -m 20 "${H[@]}" -H "Content-Type: application/json" -X POST "$URL/api/sessions" -d "{\"name\":\"$NAME\"}" -w "\n%{http_code}")
CODE="${CREATE##*$'\n'}"; BODY="${CREATE%$'\n'*}"
echo "criar: HTTP $CODE"; echo "$BODY" | head -c 300; echo
ID=$(echo "$BODY" | python3 -c 'import sys,json;
try: print(json.load(sys.stdin).get("id",""))
except Exception: print("")')
if [ -z "$ID" ]; then echo "sem id, parando aqui"; exit 1; fi
echo "start: HTTP $(curl -sS -m 20 "${H[@]}" -X POST "$URL/api/sessions/$ID/start" -o /dev/null -w '%{http_code}')"
sleep 6
QR=$(curl -sS -m 20 "${H[@]}" "$URL/api/sessions/$ID/qr" -w "\n%{http_code}")
echo "qr: HTTP ${QR##*$'\n'} | campos: $(echo "${QR%$'\n'*}" | python3 -c 'import sys,json
try:
    d=json.load(sys.stdin); print({k:(len(v) if isinstance(v,str) else v) for k,v in d.items()})
except Exception as e: print("não-JSON")')"
echo "apagar: HTTP $(curl -sS -m 20 "${H[@]}" -X DELETE "$URL/api/sessions/$ID" -o /dev/null -w '%{http_code}')"
