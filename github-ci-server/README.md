# GitHub App CI Server (Octo RuboCop)

A Sinatra server that implements GitHub's
[Building CI checks with a GitHub App](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-ci-checks-with-a-github-app)
tutorial. It listens for `check_suite` / `check_run` webhooks, clones the
repository, runs RuboCop, and reports results as a check run with inline
annotations — plus a "Fix this" button that auto-corrects offenses and pushes
a commit.

## Setup

### 1. Webhook proxy (local development)

Go to <https://smee.io/> and click **Start a new channel**, then:

```sh
npm install --global smee-client
smee --url https://smee.io/YOUR_CHANNEL --path /event_handler --port 3000
```

### 2. Register a GitHub App

At <https://github.com/settings/apps> → **New GitHub App**:

- **Webhook URL**: your smee.io channel URL
- **Webhook secret**: pick a strong secret
- **Repository permissions**: Checks — Read & write, Contents — Read & write
- **Subscribe to events**: Check suite, Check run
- **Where can this app be installed**: Only on this account

Then generate and download a **private key** (.pem), and install the app on a
test repository.

### 3. Configure environment

```sh
cp .env.example .env
# fill in app ID, webhook secret, and private key
```

### 4. Run

```sh
bundle install
bundle exec ruby server.rb
```

### Or run in a container (podman/docker)

```sh
podman build -t github-ci-server .
podman run -d -p 3000:3000 --env-file .env github-ci-server
# or with compose:
podman compose up -d
```

The image is `ruby:3.3-slim` plus git (needed to clone repos for linting),
runs as a non-root user, and clones into `/app/work`.

Push a commit to a repo the app is installed on — a check run named
**Octo RuboCop** appears on the commit / pull request.
