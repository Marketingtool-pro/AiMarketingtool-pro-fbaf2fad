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

def required_env(name)
  value = ENV[name]
  abort("Missing required environment variable: #{name}. Set it in your environment or a .env file before running this script.") if value.nil? || value.strip.empty?
  value
end

def load_private_key(filename)
  path = File.expand_path(filename, __dir__)

  unless File.file?(path) && File.readable?(path)
    warn "Private key file not found or not readable: #{path}"
    exit 1
  end

  begin
    OpenSSL::PKey::EC.new(File.read(path))
  rescue Errno::EACCES, Errno::ENOENT, OpenSSL::PKey::ECError => e
    warn "Failed to load private key from #{path}: #{e.message}"
    exit 1
  end
end

KEY_ID   = required_env('ASC_KEY_ID')
ISSUER   = required_env('ASC_ISSUER_ID')
APP_ID   = required_env('ASC_APP_ID')
KEY_PATH = ENV.fetch('ASC_KEY_PATH', 'AuthKey_69JDXUCPU3.p8')
KEY      = load_private_key(KEY_PATH)

@cached_token = nil
@cached_token_exp = 0

def token
  now = Time.now.to_i
  return @cached_token if @cached_token && now < (@cached_token_exp - 30)

  exp = now + 600
  payload = { iss: ISSUER, iat: now, exp: exp, aud: 'appstoreconnect-v1' }
  @cached_token = JWT.encode(payload, KEY, 'ES256', { kid: KEY_ID, typ: 'JWT' })
  @cached_token_exp = exp
  @cached_token
end

def get(path)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  req = Net::HTTP::Get.new(uri)
  req['Authorization'] = "Bearer #{token}"
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 30) { |h| h.request(req) }
  parsed_body = begin
    JSON.parse(res.body)
  rescue JSON::ParserError => e
    warn "JSON parse failed for #{path} (HTTP #{res.code}): #{e.class}: #{e.message}"
    res.body
  end
  [res.code, parsed_body]
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
