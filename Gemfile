# frozen_string_literal: true

source 'https://rubygems.org'

ruby '3.4.11'

gem 'activesupport', '>= 5.0', '< 8.0'
gem 'addressable', '~> 2.3'
gem 'atomic', '>= 1.1.101'
gem 'bigdecimal', '>= 4.1.3'
gem 'cocoapods', '>= 1.15.2'
gem 'coder'
gem 'connection_pool'
gem 'ed25519'
gem 'faraday'
gem 'faraday_middleware'
gem 'ffi', '>= 1.17.4'
gem 'io-console', '>= 0.9.4'
gem 'json'
gem 'jwt', '~> 2.10'
gem 'metriks'
gem 'minitar'
gem 'msgpack', '>= 1.8.5'
gem 'net-http'
gem 'nio4r', '>= 2.7.5'
gem 'octokit', '>= 4.0', '< 10.0'
gem 'prism', '>= 1.9'
gem 'puma', '>= 6.4.3'
gem 'rack-ssl', '~> 1.4'
gem 'rake'
gem 'rbtrace', '>= 0.5.0'
gem 'redis', '~> 5'
gem 'rest-client'
gem 'rexml', '>= 3.3.9'
gem 'sentry-ruby'
gem 'ssh_data'
gem 'uri'

# Git-sourced gems
gem 'metriks-librato_metrics', git: 'https://github.com/eric/metriks-librato_metrics.git'
gem 'openssl', git: 'https://github.com/ruby/openssl'
gem 'sinatra-contrib', git: 'https://github.com/sinatra/sinatra.git', tag: 'v4.2.1'
gem 'travis-github_apps', git: 'https://github.com/travis-ci/travis-github_apps', branch: 'ga-ext_access'
gem 'travis-rollout', git: 'https://github.com/travis-ci/travis-rollout.git'
gem 'travis-support', git: 'https://github.com/travis-ci/travis-support.git'

# Moved jemalloc to target production setups only so it doesn't fail your local macOS clang compiler
group :production do
  gem 'jemalloc', git: 'https://github.com/travis-ci/jemalloc-rb.git'
end

group :development do
  gem 'rerun'
end

group :development, :test do
  gem 'pry', '>= 0.14.2'
end

group :test do
  gem 'codeclimate-test-reporter'
  gem 'mocha'
  gem 'parallel_tests'
  gem 'rack-test', '>= 2.1.0'
  gem 'rspec', '~> 3.0'
  gem 'rubocop', '~> 1.91'
  gem 'simplecov'
  gem 'travis'
  gem 'webmock'
end
