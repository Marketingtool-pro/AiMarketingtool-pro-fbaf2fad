#!/usr/bin/env ruby
# Clean submit: clear any in-progress review submissions (the 409 cause), attach
# build 512, then create ONE submission with the version + 6 subs + consumable
# and submit it. Runs locally via the ASC API — nothing touches GitHub.
# DRY_RUN=true (default) only prints the plan. DRY_RUN=false executes.
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'; require 'uri'
KEY_ID="69JDXUCPU3"; ISSUER="313ffa8d-5aed-4aad-a012-b1057717634c"; APP="6758618412"
KEY=File.expand_path("../AuthKey_#{KEY_ID}.p8", __dir__)
WANT_BUILD=ENV.fetch("BUILD_NUMBER","512")
DRY=ENV.fetch("DRY_RUN","true")!="false"
pk=OpenSSL::PKey::EC.new(File.read(KEY)); n=Time.now.to_i
TOK=JWT.encode({iss:ISSUER,iat:n,exp:n+1100,aud:"appstoreconnect-v1"},pk,"ES256",{kid:KEY_ID,typ:"JWT"})
BASE="https://api.appstoreconnect.apple.com"
def req(m,p,b=nil)
  u=URI("#{BASE}#{p}");k={get:Net::HTTP::Get,post:Net::HTTP::Post,patch:Net::HTTP::Patch,delete:Net::HTTP::Delete}[m]
  r=k.new(u);r["Authorization"]="Bearer #{TOK}";r["Content-Type"]="application/json";r.body=JSON.generate(b) if b
  res=Net::HTTP.start(u.host,u.port,use_ssl:true){|h|h.request(r)};[res.code.to_i,(JSON.parse(res.body) rescue {})]
end
puts "=== MODE: #{DRY ? 'DRY RUN (no changes)' : 'LIVE'} ==="

# build
c,b=req(:get,"/v1/builds?filter[app]=#{APP}&limit=20")
build=(b["data"]||[]).find{|x| x["attributes"]["version"]==WANT_BUILD && x["attributes"]["processingState"]=="VALID"}
abort "build #{WANT_BUILD} not VALID/found" unless build
puts "Build: #{WANT_BUILD} (#{build['id']})"

# version
c,v=req(:get,"/v1/apps/#{APP}/appStoreVersions?filter[platform]=IOS&limit=5")
ver=(v["data"]||[]).find{|x| %w[PREPARE_FOR_SUBMISSION READY_FOR_REVIEW REJECTED DEVELOPER_REJECTED METADATA_REJECTED].include?(x["attributes"]["appStoreState"])} || v["data"][0]
puts "Version: #{ver['attributes']['versionString']} state=#{ver['attributes']['appStoreState']} (#{ver['id']})"

# existing review submissions (the 409 source)
c,subs=req(:get,"/v1/reviewSubmissions?filter[app]=#{APP}&include=items")
inflight=(subs["data"]||[]).reject{|s| s["attributes"]["state"]=="COMPLETE"}
puts "\nIn-progress review submissions to CLEAR (#{inflight.size}):"
inflight.each{|s| puts "  - #{s['id']} state=#{s['attributes']['state']} items=#{(s.dig('relationships','items','data')||[]).size}"}

# IAPs
c,g=req(:get,"/v1/apps/#{APP}/subscriptionGroups?include=subscriptions&limit=50")
sbs=((g["included"]||[]).select{|i| i["type"]=="subscriptions"})
c,i=req(:get,"/v1/apps/#{APP}/inAppPurchasesV2?limit=50")
cons=(i["data"]||[])
puts "\nWill submit: build #{WANT_BUILD} + version + #{sbs.size} subs + #{cons.size} consumable"

if DRY
  puts "\n✅ DRY RUN — nothing changed. Re-run with DRY_RUN=false to clear drafts + submit."
  exit 0
end

# 1) clean up any leftover in-progress submissions (UI normally handles this)
inflight.each{|s| c,_=req(:delete,"/v1/reviewSubmissions/#{s['id']}"); puts "delete #{s['id']}: HTTP #{c}"}
# 2) attach build
req(:patch,"/v1/appStoreVersions/#{ver['id']}",{data:{type:"appStoreVersions",id:ver['id'],relationships:{build:{data:{type:"builds",id:build['id']}}}}})
puts "build attached"
# 3) create submission
c,rs=req(:post,"/v1/reviewSubmissions",{data:{type:"reviewSubmissions",attributes:{platform:"IOS"},relationships:{app:{data:{type:"apps",id:APP}}}}})
abort "create failed #{c}: #{rs}" unless [200,201].include?(c)
rsid=rs["data"]["id"]; puts "submission #{rsid} created"
# 4) add items — collect every result; print full error body on failure
items=[["appStoreVersions",ver['id']]]+sbs.map{|s|["subscriptions",s['id']]}+cons.map{|x|["inAppPurchases",x['id']]}
failures=[]
items.each do |type,id|
  rel=type.sub(/s$/,'')
  c,body=req(:post,"/v1/reviewSubmissionItems",{data:{type:"reviewSubmissionItems",relationships:{reviewSubmission:{data:{type:"reviewSubmissions",id:rsid}},rel.to_sym=>{data:{type:type,id:id}}}}})
  ok=[200,201].include?(c)
  puts "  #{ok ? '✔':'✗ '+c.to_s} #{type} #{id}"
  unless ok
    err=(body["errors"]||[]).map{|e| "#{e['title']}: #{e['detail']}"}.join(" | ")
    puts "      ↳ #{err}"
    failures<<[type,id,c,err]
  end
end
# 5) ABORT if any item failed — never submit a binary-only / partial bundle
unless failures.empty?
  puts "\n❌ ABORTING — #{failures.size} item(s) could not be attached. NOT submitting (would be incomplete)."
  puts "   Deleting the partial draft submission #{rsid} to keep things clean..."
  dc,_=req(:delete,"/v1/reviewSubmissions/#{rsid}"); puts "   delete draft: HTTP #{dc}"
  exit 1
end
# 6) STAGE-ONLY stop: when STAGE_ONLY=true we attach everything but DO NOT submit,
# leaving a complete draft for a human to eyeball + submit. Used so the final,
# irreversible "Submit to App Review" is an explicit, separate, confirmed action.
if ENV["STAGE_ONLY"]=="true"
  puts "\n✅ STAGED submission #{rsid} with #{items.size} items (build #{WANT_BUILD} + version + #{items.size-1} IAPs). NOT submitted."
  puts "   To submit: re-run with STAGE_ONLY unset (DRY_RUN=false), or click Submit in the browser."
  exit 0
end
# 7) submit — only reached when version + ALL 6 subs + consumable attached
c,_=req(:patch,"/v1/reviewSubmissions/#{rsid}",{data:{type:"reviewSubmissions",id:rsid,attributes:{submitted:true}}})
puts c==200||c==204 ? "\n🚀 SUBMITTED build #{WANT_BUILD} + #{items.size-1} IAPs to App Review." : "\n❌ submit failed #{c}"
