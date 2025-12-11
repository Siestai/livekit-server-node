.PHONY: dev

dev: ## Run development setup and start services
	pnpm i
	pnpm run whisper:setup
	pnpm run download-files
	pnpm run whisper:start
	pnpm run dev
