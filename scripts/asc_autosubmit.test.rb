# frozen_string_literal: true

# Run: ruby scripts/asc_autosubmit.test.rb
#
# Runs the real asc_autosubmit.rb against a fake App Store Connect. The fake
# can play a second release run that attaches its own build to the shared
# editable version at a chosen point, which is the race between
# production-deploy.yml and ios-deploy-selfcontained.yml.
require 'minitest/autorun'
require 'json'
require 'fileutils'
require 'open3'
require 'openssl'
require 'tmpdir'
require 'yaml'

ROOT = File.expand_path('..', __dir__)
SCRIPT = File.join(ROOT, 'scripts', 'asc_autosubmit.rb')

FAKE_JWT = <<~RUBY
  module JWT
    def self.encode(*) = 'test-token'
  end
RUBY

# Replaces Net::HTTP.start. Writes the version's build at submit time to
# FAKE_ASC_LOG. After the request named in FAKE_ASC_OTHER_RUN_AFTER, the
# "other run" attaches build-b to the version.
FAKE_ASC = <<~'RUBY'
  require 'json'
  require 'net/http'

  module FakeAsc
    STATE = { build: nil, submitted_build: nil, review_submissions: 0 }
    Response = Struct.new(:code, :body) do
      def [](_name) = 'application/json'
    end

    def self.route(method, path, body)
      case [method, path.sub(/\?.*/, '')]
      in ['GET', '/v1/builds']
        { data: [
          { id: 'build-b', attributes: { version: '102', processingState: 'VALID', uploadedDate: 'later' } },
          { id: 'build-a', attributes: { version: '101', processingState: 'VALID', uploadedDate: 'now' } }
        ] }
      in ['GET', '/v1/apps/123/appStoreVersions']
        { data: [{ id: 'ver-1', attributes: { versionString: '9.9.9', appStoreState: 'PREPARE_FOR_SUBMISSION' } }] }
      in ['GET', '/v1/apps/123/subscriptionGroups']
        { included: [{ type: 'subscriptions', id: 'sub-1', attributes: { productId: 'sub', state: 'APPROVED' } }] }
      in ['GET', '/v1/apps/123/inAppPurchasesV2']
        { data: [{ id: 'iap-1', attributes: { productId: 'iap', state: 'APPROVED' } }] }
      in ['PATCH', '/v1/appStoreVersions/ver-1']
        STATE[:build] = body.dig('data', 'relationships', 'build', 'data', 'id')
        {}
      in ['GET', '/v1/appStoreVersions/ver-1/relationships/build']
        { data: STATE[:build] && { type: 'builds', id: STATE[:build] } }
      in ['POST', '/v1/reviewSubmissions']
        STATE[:review_submissions] += 1
        { data: { id: 'rs-1' } }
      in ['PATCH', '/v1/reviewSubmissions/rs-1']
        STATE[:submitted_build] = STATE[:build]
        {}
      else
        {}
      end
    end

    def self.request(r)
      key = "#{r.method} #{r.path.sub(/\?.*/, '')}"
      out = route(r.method, r.path, r.body ? JSON.parse(r.body) : nil)
      STATE[:build] = 'build-b' if key == ENV['FAKE_ASC_OTHER_RUN_AFTER']
      File.write(ENV.fetch('FAKE_ASC_LOG'), JSON.generate(STATE))
      Response.new(r.method == 'POST' ? '201' : '200', JSON.generate(out))
    end
  end

  class Net::HTTP
    def self.start(*, **)
      conn = Object.new
      def conn.request(r) = FakeAsc.request(r)
      yield conn
    end
  end
RUBY

class AscAutosubmitInterleavingTest < Minitest::Test
  def run_script(other_run_after: nil)
    Dir.mktmpdir do |dir|
      key_dir = File.join(dir, '.appstoreconnect', 'private_keys')
      FileUtils.mkdir_p(key_dir)
      File.write(File.join(key_dir, 'AuthKey_TESTKEY.p8'), OpenSSL::PKey::EC.generate('prime256v1').to_pem)
      File.write(File.join(dir, 'jwt.rb'), FAKE_JWT)
      File.write(File.join(dir, 'fake_asc.rb'), FAKE_ASC)
      log = File.join(dir, 'state.json')
      env = {
        'HOME' => dir, 'ASC_KEY_ID' => 'TESTKEY', 'ASC_ISSUER_ID' => 'issuer', 'ASC_APP_ID' => '123',
        'ASC_KEY_PATH' => File.join(key_dir, 'AuthKey_TESTKEY.p8'), 'BUILD_NUMBER' => '101',
        'DRY_RUN' => 'false', 'WHATS_NEW' => 'Notes', 'FAKE_ASC_LOG' => log,
        'FAKE_ASC_OTHER_RUN_AFTER' => other_run_after.to_s
      }
      out, status = Open3.capture2e(env, 'ruby', '-I', dir, '-r', 'fake_asc', SCRIPT)
      [status, out, JSON.parse(File.read(log), symbolize_names: true)]
    end
  end

  def test_submits_this_runs_build_when_no_other_run_interferes
    status, out, state = run_script
    assert status.success?, out
    assert_equal 'build-a', state[:submitted_build]
  end

  def test_refuses_to_submit_when_other_run_replaces_build_after_attach
    status, out, state = run_script(other_run_after: 'PATCH /v1/appStoreVersions/ver-1')
    refute status.success?
    assert_match(/before review submission: version 9\.9\.9 holds build build-b, not this run's build 101/, out)
    assert_equal 0, state[:review_submissions]
    assert_nil state[:submitted_build]
  end

  def test_refuses_to_submit_when_other_run_replaces_build_after_items_added
    status, out, state = run_script(other_run_after: 'POST /v1/reviewSubmissionItems')
    refute status.success?
    assert_match(/NOT submitted \(review submission rs-1 left as a draft\)/, out)
    assert_nil state[:submitted_build]
  end

  def test_fails_loudly_when_other_run_replaces_build_after_submit
    status, out, = run_script(other_run_after: 'PATCH /v1/reviewSubmissions/rs-1')
    refute status.success?
    assert_match(/SUBMITTED WITH THE WRONG BUILD — remove review submission rs-1/, out)
  end
end

# The script check narrows the race but cannot close it. Only one job that runs
# asc_autosubmit.rb may run at a time, across every workflow and ref.
class AscReviewConcurrencyTest < Minitest::Test
  GROUP = 'app-store-review-ios'

  def review_jobs
    Dir[File.join(ROOT, '.github', 'workflows', '*.yml')].flat_map do |path|
      jobs = YAML.safe_load_file(path).fetch('jobs', {})
      jobs.select { |_, job| (job['steps'] || []).any? { |s| s['run'].to_s.include?('asc_autosubmit.rb') } }
          .map { |id, job| ["#{File.basename(path)}:#{id}", job] }
    end
  end

  def test_every_review_job_shares_one_queue
    jobs = review_jobs
    assert_operator jobs.size, :>=, 3
    jobs.each do |name, job|
      assert_equal({ 'group' => GROUP, 'cancel-in-progress' => false }, job['concurrency'], name)
    end
  end
end
