.PHONY: start install runner clean help

help:
	@echo "Available shortcuts:"
	@echo "  make install  - Installs Node dependencies"
	@echo "  make start    - Launches the Expo mobile application"
	@echo "  make runner   - Launches the GitHub Actions automated runner"

install:
	npm install

start:
	npx expo start

runner:
	./run.sh

clean:
	rm -rf node_modules .expo dist bin externals
