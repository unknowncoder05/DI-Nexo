SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: start stop

start:
	@mkdir -p .runtime
	if [[ -f .runtime/dev.pid ]] && kill -0 "$$(cat .runtime/dev.pid)" 2>/dev/null; then
		echo "Nexo ya está iniciado. Logs: .runtime/dev.log"
		exit 0
	fi
	[[ -d node_modules ]] || { echo "Ejecuta npm ci primero."; exit 1; }
	[[ -f .env ]] || { echo "Ejecuta npm run setup y configura .env primero."; exit 1; }
	node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major !== 24 || minor < 15) { console.error("Usa Node 24.15 o superior de la rama 24: nvm install && nvm use"); process.exit(1); }'
	nohup setsid npm start > .runtime/dev.log 2>&1 < /dev/null &
	pid=$$!
	printf '%s\n' "$$pid" > .runtime/dev.pid
	sleep 1
	if ! kill -0 "$$pid" 2>/dev/null; then
		rm -f .runtime/dev.pid
		tail -n 20 .runtime/dev.log
		exit 1
	fi
	echo "Nexo iniciándose en http://localhost:4200 (API: 4310)."
	echo "Logs: .runtime/dev.log · Detener: make stop"

stop:
	@if [[ ! -f .runtime/dev.pid ]]; then
		echo "Nexo no está iniciado con make start."
		exit 0
	fi
	pid=$$(cat .runtime/dev.pid)
	[[ "$$pid" =~ ^[1-9][0-9]*$$ ]] || { echo "PID inválido en .runtime/dev.pid."; exit 1; }
	kill -TERM -- "-$$pid" 2>/dev/null || true
	rm -f .runtime/dev.pid
	echo "Nexo detenido."
