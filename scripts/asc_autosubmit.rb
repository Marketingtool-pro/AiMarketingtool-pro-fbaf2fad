#!/usr/bin/env ruby
# =============================================================================
# App Store Connect auto-submit that CARRIES THE IAPs.
#
# Why this exists: `eas submit` (and the old CI) only create a binary-only
# "1 Item" review submission. A first-time IAP must be reviewed TOGETHER with
# the build, so binary-only submissions get auto-rejected under 2.1(b). This
# script creates ONE review submission containing the build's app version PLUS
# every subscription and the consumable, then submits it.
#
# SAFETY: DRY_RUN=true (default) only READS and prints the plan. No writes.
#         Set DRY_RUN=false to actually attach + submit to Apple.
#
# Env:
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_APP_ID  (have defaults below)
#   ASC_KEY_PATH   path to the .p8 (default: ../AuthKey_<id>.p8)
#   BUILD_NUMBER   specific build to ship (default: newest VALID build)
#   DRY_RUN        "false" to go live (default "true")
# =============================================================================
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'; require 'uri'

KEY_ID    = ENV.fetch('ASC_KEY_ID', '69JDXUCPU3')
ISSUER_ID = ENV.fetch('ASC_ISSUER_ID', '313ffa8d-5aed-4aad-a012-b1057717634c')
APP_ID    = ENV.fetch('ASC_APP_ID', '6758618412')
KEY_PATH  = ENV.fetch('ASC_KEY_PATH', File.expand_path("../AuthKey_#{KEY_ID}.p8", __dir__))
DRY_RUN   = ENV.fetch('DRY_RUN', 'true') != 'false'
WANT_BUILD = ENV['BUILD_NUMBER']

abort "❌ key not found: #{KEY_PATH}" unless File.exist?(KEY_PATH)
pk = OpenSSL::PKey::EC.new(File.read(KEY_PATH)); now = Time.now.to_i
TOKEN = JWT.encode({ iss: ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' },
                   pk, 'ES256', { kid: KEY_ID, typ: 'JWT' })
BASE = 'https://api.appstoreconnect.apple.com'

def req(method, path, body = nil)
  uri = URI("#{BASE}#{path}")
  klass = { get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch }[method]
  r = klass.new(uri)
  r['Authorization'] = "Bearer #{TOKEN}"
  r['Content-Type'] = 'application/json'
  r.body = JSON.generate(body) if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(r) }
  [res.code.to_i, (JSON.parse(res.body) rescue {})]
end
def get(p) = req(:get, p)

puts "=== MODE: #{DRY_RUN ? 'DRY RUN (read-only, no submit)' : 'LIVE (will attach + submit to Apple)'} ==="

# 1) pick the build. If BUILD_NUMBER is given, WAIT (poll) until THAT build is
#    VALID — never silently fall back to an older (possibly crashing) build.
def newest_valid_or_target(want)
  code, builds = get("/v1/builds?filter[app]=#{APP_ID}&limit=20")
  return [nil, "builds fetch failed #{code}"] unless code == 200
  list = builds['data'] || []
  if want
    b = list.find { |x| x['attributes']['version'] == want }
    return [nil, "build #{want} not uploaded yet"] unless b
    return [nil, "build #{want} processing=#{b['attributes']['processingState']}"] unless b['attributes']['processingState'] == 'VALID'
    [b, nil]
  else
    v = list.select { |x| x['attributes']['processingState'] == 'VALID' }.first
    v ? [v, nil] : [nil, 'no VALID build']
  end
end

build = nil
tries = WANT_BUILD ? 40 : 1   # ~20 min wait when targeting a specific build
tries.times do |i|
  build, err = newest_valid_or_target(WANT_BUILD)
  break if build
  abort "❌ #{err}" if i == tries - 1
  puts "… waiting for build #{WANT_BUILD} to finish processing (#{err}) [#{i + 1}/#{tries}]"
  sleep 30
end
abort "❌ no usable build#{WANT_BUILD ? " #{WANT_BUILD}" : ''}" unless build
puts "Build to ship: #{build['attributes']['version']} (#{build['id']}) uploaded #{build['attributes']['uploadedDate']}"

# 2) editable iOS app store version
code, vers = get("/v1/apps/#{APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5")
ver = (vers['data'] || []).find { |v| %w[PREPARE_FOR_SUBMISSION REJECTED DEVELOPER_REJECTED METADATA_REJECTED].include?(v['attributes']['appStoreState']) } || vers['data']&.first
abort "❌ no app store version found" unless ver
puts "Version: #{ver['attributes']['versionString']} state=#{ver['attributes']['appStoreState']} (#{ver['id']})"

# 3) the IAP items to bundle
code, groups = get("/v1/apps/#{APP_ID}/subscriptionGroups?include=subscriptions&limit=50")
subs = ((groups['included'] || []).select { |i| i['type'] == 'subscriptions' })
code, iaps = get("/v1/apps/#{APP_ID}/inAppPurchasesV2?limit=50")
consumables = (iaps['data'] || [])
puts "\nIAPs to include in the submission:"
subs.each { |s| puts "  [sub] #{s['attributes']['productId']}  state=#{s['attributes']['state']}  (#{s['id']})" }
consumables.each { |c| puts "  [iap] #{c['attributes']['productId']}  state=#{c['attributes']['state']}  (#{c['id']})" }

items = []
items << { type: 'appStoreVersions', id: ver['id'] }
subs.each        { |s| items << { type: 'subscriptions', id: s['id'] } }
consumables.each { |c| items << { type: 'inAppPurchases', id: c['id'] } }
puts "\nSubmission will contain #{items.size} items (1 build version + #{subs.size} subs + #{consumables.size} consumable)."

if DRY_RUN
  puts "\n✅ DRY RUN complete — nothing was changed. Re-run with DRY_RUN=false to attach + submit."
  exit 0
end

# ---- LIVE writes below ----
# 3a) attach build to the version
code, _ = req(:patch, "/v1/appStoreVersions/#{ver['id']}",
  { data: { type: 'appStoreVersions', id: ver['id'],
            relationships: { build: { data: { type: 'builds', id: build['id'] } } } } })
abort "❌ attach build failed #{code}" unless [200, 204].include?(code)
puts "✔ build #{build['attributes']['version']} attached to version"

# 4) create review submission
code, rs = req(:post, '/v1/reviewSubmissions',
  { data: { type: 'reviewSubmissions',
            attributes: { platform: 'IOS' },
            relationships: { app: { data: { type: 'apps', id: APP_ID } } } } })
abort "❌ create reviewSubmission failed #{code}: #{rs}" unless [200, 201].include?(code)
rs_id = rs['data']['id']
puts "✔ review submission #{rs_id} created"

# 5) add each item
items.each do |it|
  code, r = req(:post, '/v1/reviewSubmissionItems',
    { data: { type: 'reviewSubmissionItems',
              relationships: {
                reviewSubmission: { data: { type: 'reviewSubmissions', id: rs_id } },
                it[:type].sub(/s$/, '').to_sym => { data: { type: it[:type], id: it[:id] } }
              } } })
  puts "  #{[200,201].include?(code) ? '✔' : '✗ ' + code.to_s} item #{it[:type]} #{it[:id]}"
end

# 6) submit
code, _ = req(:patch, "/v1/reviewSubmissions/#{rs_id}",
  { data: { type: 'reviewSubmissions', id: rs_id, attributes: { submitted: true } } })
abort "❌ submit failed #{code}" unless [200, 204].include?(code)
puts "\n🚀 SUBMITTED to App Review with build + #{items.size - 1} IAPs."
