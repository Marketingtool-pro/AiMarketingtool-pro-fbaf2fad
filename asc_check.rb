#!/usr/bin/env ruby
# Query App Store Connect: subscriptions + prices + build 512 + review state.
require 'jwt'; require 'net/http'; require 'json'; require 'openssl'

def required_env(name)
  value = ENV[name]
  abort("Missing required environment variable: #{name}") if value.nil? || value.strip.empty?
  value
end

def load_private_key(filename)
  path = File.expand_path(filename, __dir__)

  abort("Private key file not found or not readable: #{path}") unless File.file?(path) && File.readable?(path)

  begin
    OpenSSL::PKey::EC.new(File.read(path))
  rescue Errno::EACCES, Errno::ENOENT, OpenSSL::PKey::ECError => e
    abort("Failed to load private key from #{path}: #{e.message}")
  end
end

KEY_ID = required_env('ASC_KEY_ID')
ISSUER = required_env('ASC_ISSUER_ID')
APP_ID = required_env('ASC_APP_ID')
KEY_PATH = ENV.fetch('ASC_KEY_PATH', "AuthKey_#{KEY_ID}.p8")
KEY = load_private_key(KEY_PATH)

@cached_token = nil
@cached_token_exp = 0

def token
  now = Time.now.to_i
  # Refresh slightly early to avoid clock-skew and near-expiry request failures.
  return @cached_token if @cached_token && now < (@cached_token_exp - 30)

  exp = now + 600
  payload = { iss: ISSUER, iat: now, exp: exp,
              aud: 'appstoreconnect-v1' }
  @cached_token = JWT.encode(payload, KEY, 'ES256', { kid: KEY_ID, typ: 'JWT' })
  @cached_token_exp = exp
  @cached_token
end

def get(path)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  req = Net::HTTP::Get.new(uri)
  req['Authorization'] = 'Bearer ' + token
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 30) { |h| h.request(req) }
  parsed_body = begin
    JSON.parse(res.body)
  rescue JSON::ParserError => e
    warn "JSON parse failed for #{path} (HTTP #{res.code}): #{e.message}"
    res.body
  end
  [res.code, parsed_body]
end

puts "=== SUBSCRIPTION GROUPS ==="
code, groups = get("/v1/apps/#{APP_ID}/subscriptionGroups")
puts "HTTP #{code}"
(groups['data'] || []).each do |g|
  gid = g['id']
  puts "\nGroup #{gid} #{g.dig('attributes','referenceName')}"
  c2, subs = get("/v1/subscriptionGroups/#{gid}/subscriptions?limit=50")
  (subs['data'] || []).each do |s|
    a = s['attributes']
    puts "  - #{a['productId']}  | name=#{a['name']} | state=#{a['state']} | period=#{a['subscriptionPeriod']}"
    # price points
    c3, prices = get("/v1/subscriptions/#{s['id']}/prices?include=subscriptionPricePoint&limit=10")
    inc = (prices['included'] || []).select { |i| i['type'] == 'subscriptionPricePoints' }
    inc.each { |pp| puts "        price: #{pp.dig('attributes','customerPrice')} (#{pp.dig('attributes','proceeds')} proceeds)" }
  end
end

puts "\n=== IN-APP PURCHASES (consumables) ==="
code, iaps = get("/v1/apps/#{APP_ID}/inAppPurchasesV2?limit=50")
puts "HTTP #{code}"
(iaps['data'] || []).each do |i|
  a = i['attributes']
  puts "  - #{a['productId']} | #{a['name']} | state=#{a['state']} | type=#{a['inAppPurchaseType']}"
end

puts "\n=== BUILDS (latest) ==="
code, builds = get("/v1/builds?filter[app]=#{APP_ID}&limit=5&sort=-version")
puts "HTTP #{code}"
(builds['data'] || []).each do |b|
  a = b['attributes']
  puts "  - build #{a['version']} | uploaded=#{a['uploadedDate']} | state=#{a['processingState']} | expired=#{a['expired']}"
end

puts "\n=== APP STORE VERSIONS ==="
code, vers = get("/v1/apps/#{APP_ID}/appStoreVersions?limit=3")
puts "HTTP #{code}"
(vers['data'] || []).each do |v|
  a = v['attributes']
  puts "  - #{a['versionString']} | state=#{a['appStoreState'] || a['appVersionState']} | platform=#{a['platform']}"
end
