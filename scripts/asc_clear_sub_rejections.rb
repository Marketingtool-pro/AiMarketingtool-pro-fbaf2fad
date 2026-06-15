#!/usr/bin/env ruby
# Clear the "Rejected" state on each subscription localization so the subs become
# submittable again (they were only "returned" because the binary wasn't sent).
# Makes a tiny, harmless change to the localized description (toggles a trailing
# period) and PATCHes it — same effect as editing+saving in the ASC UI, which
# flips the localization Rejected -> Prepare for Submission. Runs locally via the
# ASC API. DRY_RUN=true (default) only prints; DRY_RUN=false executes.
require 'jwt'
require 'openssl'
require 'net/http'
require 'json'
require 'uri'
KEY_ID = ENV.fetch("ASC_KEY_ID") { raise "Missing required env var ASC_KEY_ID" }
ISSUER = ENV.fetch("ASC_ISSUER_ID") { raise "Missing required env var ASC_ISSUER_ID" }
KEY = File.expand_path(ENV.fetch("ASC_PRIVATE_KEY_PATH") { raise "Missing required env var ASC_PRIVATE_KEY_PATH" }, __dir__)
DRY=ENV.fetch("DRY_RUN","true")!="false"
DEFAULT_SUBS=%w[6760442919 6760486886 6760490715 6760491034 6760491514 6760492298]
SUBS=(ENV["SUBS"] || "").split(/[,\s]+/).reject(&:empty?)
SUBS=DEFAULT_SUBS if SUBS.empty?
pk=OpenSSL::PKey::EC.new(File.read(KEY)); n=Time.now.to_i
TOK=JWT.encode({iss:ISSUER,iat:n,exp:n+1100,aud:"appstoreconnect-v1"},pk,"ES256",{kid:KEY_ID,typ:"JWT"})
BASE="https://api.appstoreconnect.apple.com"
def req(m,p,b=nil)
  u=URI("#{BASE}#{p}");k={get:Net::HTTP::Get,patch:Net::HTTP::Patch}[m]
  r=k.new(u);r["Authorization"]="Bearer #{TOK}";r["Content-Type"]="application/json";r.body=JSON.generate(b) if b
  res=Net::HTTP.start(u.host,u.port,use_ssl:true){|h|h.request(r)}
  parsed_body =
    begin
      JSON.parse(res.body)
    rescue JSON::ParserError => e
      warn "JSON parse failed (HTTP #{res.code}): #{e.message}; body=#{res.body.to_s[0,200].inspect}"
      {}
    end
  [res.code.to_i, parsed_body]
end
puts "=== MODE: #{DRY ? 'DRY RUN (no changes)' : 'LIVE'} ==="
SUBS.each do |sid|
  c,loc=req(:get,"/v1/subscriptions/#{sid}/subscriptionLocalizations")
  (loc["data"]||[]).each do |l|
    lid=l["id"]; a=l["attributes"]||{}; locale=a["locale"]; desc=a["description"].to_s; name=a["name"]
    newdesc = desc.end_with?(".") ? desc[0..-2] : desc + "."
    puts "sub #{sid} [#{locale}] #{name.inspect}: '#{desc}' -> '#{newdesc}'"
    next if DRY
    pc,pb=req(:patch,"/v1/subscriptionLocalizations/#{lid}",{data:{type:"subscriptionLocalizations",id:lid,attributes:{description:newdesc}}})
    if [200].include?(pc)
      puts "   ✔ patched HTTP #{pc}"
    else
      err=((pb["errors"]||[]).map{|e| "#{e['title']}: #{e['detail']}"}.join(" | "))
      puts "   ✗ HTTP #{pc} #{err}"
    end
  end
end
puts DRY ? "\n✅ DRY RUN — re-run with DRY_RUN=false to apply." : "\n✅ Done. Re-check subscription statuses in ASC."
