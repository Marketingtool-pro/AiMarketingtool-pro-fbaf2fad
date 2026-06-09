#!/usr/bin/env ruby
# =============================================================================
# asc_check.rb — App Store Connect build readiness checker
#
# Polls ASC and reports whether the latest (or a specific) iOS build for
# MarketingTool Pro is VALID (ready to submit for review) or still processing.
# Exits 0 when the target build is VALID, non-zero otherwise.
#
# Usage:
#   ruby asc_check.rb                     # check latest build
#   BUILD_NUMBER=514 ruby asc_check.rb    # check a specific build number
#
# Env:
#   ASC_KEY_ID     App Store Connect API key ID   (required)
#   ASC_ISSUER_ID  ASC issuer ID                  (required)
#   ASC_APP_ID     Numeric app ID                 (required)
#   ASC_KEY_PATH   Path to AuthKey_<id>.p8        (default: ../AuthKey_<id>.p8)
#   BUILD_NUMBER   Specific build to wait for     (optional)
#   POLL_INTERVAL  Seconds between polls          (default: 30)
#   MAX_WAIT       Maximum wait time in seconds   (default: 1800 = 30 min)
# =============================================================================
require 'jwt'
require 'openssl'
require 'net/http'
require 'json'
require 'uri'

KEY_ID       = ENV.fetch('ASC_KEY_ID')
ISSUER_ID    = ENV.fetch('ASC_ISSUER_ID')
APP_ID       = ENV.fetch('ASC_APP_ID')
KEY_PATH     = ENV.fetch('ASC_KEY_PATH',  File.expand_path("../AuthKey_#{KEY_ID}.p8", __dir__))
WANT_BUILD   = ENV['BUILD_NUMBER']
POLL_INTERVAL = (ENV['POLL_INTERVAL'] || '30').to_i
MAX_WAIT     = (ENV['MAX_WAIT'] || '1800').to_i

abort "❌  Key not found: #{KEY_PATH}" unless File.exist?(KEY_PATH)

def generate_token
  pk  = OpenSSL::PKey::EC.new(File.read(KEY_PATH))
  now = Time.now.to_i
  JWT.encode(
    { iss: ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' },
    pk, 'ES256',
    { kid: KEY_ID, typ: 'JWT' }
  )
end

BASE = 'https://api.appstoreconnect.apple.com'

def asc_get(path)
  token = generate_token
  uri = URI("#{BASE}#{path}")
  r = Net::HTTP::Get.new(uri)
  r['Authorization'] = "Bearer #{token}"
  r['Content-Type']  = 'application/json'
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(r) }
  JSON.parse(res.body)
rescue => e
  { 'error' => e.message }
end

# Fetch all builds for the app, sorted newest first
def fetch_builds(after_cursor = nil)
  path  = "/v1/builds?filter[app]=#{APP_ID}&sort=-uploadedDate&limit=25&fields[builds]=version,processingState,uploadedDate"
  path += "&cursor=#{after_cursor}" if after_cursor
  asc_get(path)
end

def find_target_build(builds)
  return nil if builds.nil? || builds['data'].nil?

  if WANT_BUILD
    builds['data'].find { |b| b.dig('attributes', 'version') == WANT_BUILD }
  else
    builds['data'].first
  end
end

puts "=== ASC Build Readiness Check ==="
puts "App ID     : #{APP_ID}"
puts "Key ID     : #{KEY_ID}"
puts "Target     : #{WANT_BUILD || '(latest)'}"
puts "Max wait   : #{MAX_WAIT}s  (poll every #{POLL_INTERVAL}s)"
puts

started_at = Time.now

loop do
  elapsed = (Time.now - started_at).to_i
  if elapsed > MAX_WAIT
    puts "❌  Timed out after #{elapsed}s — build not VALID within limit"
    exit 1
  end

  data    = fetch_builds
  target  = find_target_build(data)

  if target.nil?
    next_page = data.dig('links', 'next')
    if next_page
      data   = fetch_builds(URI.decode_www_form(URI(next_page).query).to_h['cursor'])
      target = find_target_build(data)
    end
  end

  if target.nil?
    puts "[#{elapsed}s] No matching build found#{WANT_BUILD ? " for build #{WANT_BUILD}" : ''}. Retrying…"
  else
    version = target.dig('attributes', 'version')
    state   = target.dig('attributes', 'processingState')
    date    = target.dig('attributes', 'uploadedDate')
    puts "[#{elapsed}s] Build #{version} — state: #{state}  (uploaded: #{date})"

    if state == 'VALID'
      puts "✅  Build #{version} is VALID and ready to submit."
      exit 0
    elsif state == 'INVALID' || state == 'FAILED'
      puts "❌  Build #{version} is #{state}. Cannot submit."
      exit 2
    end
  end

  sleep POLL_INTERVAL
end
