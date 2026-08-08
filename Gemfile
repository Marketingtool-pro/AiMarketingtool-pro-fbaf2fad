source "https://rubygems.org"

ruby "3.2.6"

gem "activesupport", "~> 7"
gem "addressable", "~> 2.3"
gem "coder"
gem "connection_pool"
gem "ed25519"
gem "faraday"
gem "faraday_middleware"
gem "jwt", "~> 2.10"
gem "metriks", "0.9.9.6"
gem "minitar"
gem "octokit", "~> 4.18"
gem "puma", ">= 6.4.3"
gem "rack-ssl", "~> 1.4"
gem "rake"
gem "rbtrace", ">= 0.5.0"
gem "redis", "~> 4"
gem "rest-client"
gem "rexml", ">= 3.3.9"
gem "sentry-raven"
gem "ssh_data"

# Git-sourced gems
gem "jemalloc", git: "https://github.com/travis-ci/jemalloc-rb.git"
gem "metriks-librato_metrics", git: "https://github.com/eric/metriks-librato_metrics.git"
gem "sinatra-contrib", git: "https://github.com/sinatra/sinatra.git", tag: "v4.2.1"
gem "travis-config", git: "https://github.com/travis-ci/travis-config.git"
gem "travis-github_apps", git: "https://github.com/travis-ci/travis-github_apps", branch: "ga-ext_access"
gem "travis-rollout", git: "https://github.com/travis-ci/travis-rollout.git"
gem "travis-support", git: "https://github.com/travis-ci/travis-support.git"

group :development do
  gem "rerun"
end

group :development, :test do
  gem "pry", ">= 0.14.2"
end

group :test do
  gem "codeclimate-test-reporter"
  gem "mocha"
  gem "parallel_tests"
  gem "rack-test", ">= 2.1.0"
  gem "rspec", "~> 3.0"
  gem "rubocop", "~> 1.57"
  gem "simplecov"
  gem "travis"
  gem "webmock"
end

