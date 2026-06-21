# frozen_string_literal: true

# GitHub App CI server — runs RuboCop as a CI check on pushed commits.
# Based on GitHub's "Building CI checks with a GitHub App" tutorial:
# https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-ci-checks-with-a-github-app

require 'sinatra/base'
require 'octokit'
require 'dotenv/load'
require 'json'
require 'openssl'
require 'jwt'
require 'time'
require 'logger'
require 'git'

class GHAapp < Sinatra::Application
  set :port, 3000
  set :bind, '0.0.0.0'

  # GitHub App credentials — see .env.example
  PRIVATE_KEY = OpenSSL::PKey::RSA.new(ENV.fetch('GITHUB_PRIVATE_KEY').gsub('\n', "\n"))
  WEBHOOK_SECRET = ENV.fetch('GITHUB_WEBHOOK_SECRET')
  APP_IDENTIFIER = ENV.fetch('GITHUB_APP_IDENTIFIER')

  configure :development do
    set :logging, Logger::DEBUG
  end

  before '/event_handler' do
    get_payload_request(request)
    verify_webhook_signature

    # Reject repository names containing anything other than safe characters —
    # the name is interpolated into shell commands below.
    halt 400 if !@payload['repository'].nil? && @payload['repository']['name'] !~ /\A[0-9A-Za-z\-_.]+\z/

    authenticate_app
    authenticate_installation(@payload)
  end

  post '/event_handler' do
    case request.env['HTTP_X_GITHUB_EVENT']
    when 'check_suite'
      create_check_run if %w[requested rerequested].include?(@payload['action'])
    when 'check_run'
      # Only act on check runs that belong to this app.
      if @payload['check_run']['app']['id'].to_s == APP_IDENTIFIER
        case @payload['action']
        when 'created'
          initiate_check_run
        when 'rerequested'
          create_check_run
        when 'requested_action'
          take_requested_action
        end
      end
    end
    200
  end

  helpers do
    # Create a queued check run on the head commit.
    def create_check_run
      @installation_client.create_check_run(
        @payload['repository']['full_name'],
        'Octo RuboCop',
        @payload['check_run'].nil? ? @payload['check_suite']['head_sha'] : @payload['check_run']['head_sha'],
        accept: 'application/vnd.github+json'
      )
    end

    # Run RuboCop on the repo and report results as check-run annotations.
    def initiate_check_run
      @installation_client.update_check_run(
        @payload['repository']['full_name'],
        @payload['check_run']['id'],
        status: 'in_progress',
        accept: 'application/vnd.github+json'
      )

      full_repo_name = @payload['repository']['full_name']
      repository     = @payload['repository']['name']
      head_sha       = @payload['check_run']['head_sha']

      clone_repository(full_repo_name, repository, head_sha)

      @report = `rubocop '#{repository}' --format json`
      logger.debug @report
      `rm -rf '#{repository}'`
      @output = JSON.parse @report

      annotations = []
      max_annotations = 50 # the Checks API caps annotations at 50 per request

      if @output['summary']['offense_count'].zero?
        conclusion = 'success'
      else
        conclusion = 'neutral'
        @output['files'].each do |file|
          file_path = file['path'].delete_prefix("#{repository}/")
          annotation_level = 'notice'

          file['offenses'].each do |offense|
            next if max_annotations.zero?

            max_annotations -= 1

            start_line = offense['location']['start_line']
            end_line   = offense['location']['last_line']
            message    = offense['message']

            annotation = {
              path: file_path,
              start_line: start_line,
              end_line: end_line,
              annotation_level: annotation_level,
              message: message
            }
            # Column info is only valid when the annotation spans a single line.
            if start_line == end_line
              annotation[:start_column] = offense['location']['start_column']
              annotation[:end_column]   = offense['location']['last_column']
            end

            annotations.push(annotation)
          end
        end
      end

      summary = <<~SUMMARY
        Octo RuboCop summary
        - Offense count: #{@output['summary']['offense_count']}
        - File count: #{@output['summary']['target_file_count']}
        - Inspected file count: #{@output['summary']['inspected_file_count']}
      SUMMARY
      text = "Octo RuboCop version: #{@output['metadata']['rubocop_version']}"

      @installation_client.update_check_run(
        @payload['repository']['full_name'],
        @payload['check_run']['id'],
        status: 'completed',
        conclusion: conclusion,
        output: {
          title: 'Octo RuboCop',
          summary: summary,
          text: text,
          annotations: annotations
        },
        actions: [{
          label: 'Fix this',
          description: 'Automatically fix all linter notices.',
          identifier: 'fix_rubocop_notices'
        }],
        accept: 'application/vnd.github+json'
      )
    end

    # Clone the repository with an installation token and check out the ref.
    def clone_repository(full_repo_name, repository, ref)
      @git = Git.clone("https://x-access-token:#{@installation_token}@github.com/#{full_repo_name}.git", repository)
      pwd = Dir.getwd
      Dir.chdir(repository)
      @git.pull
      @git.checkout(ref)
      Dir.chdir(pwd)
    end

    # Handle the "Fix this" button: auto-correct offenses and push a commit.
    def take_requested_action
      full_repo_name = @payload['repository']['full_name']
      repository     = @payload['repository']['name']
      head_branch    = @payload['check_run']['check_suite']['head_branch']

      return unless @payload['requested_action']['identifier'] == 'fix_rubocop_notices'

      clone_repository(full_repo_name, repository, head_branch)

      @git.config('user.name', ENV.fetch('GITHUB_APP_USER_NAME'))
      @git.config('user.email', ENV.fetch('GITHUB_APP_USER_EMAIL'))

      @report = `rubocop '#{repository}/*' --format json --autocorrect`

      pwd = Dir.getwd
      Dir.chdir(repository)
      begin
        @git.commit_all('Automatically fix Octo RuboCop notices.')
        @git.push("https://x-access-token:#{@installation_token}@github.com/#{full_repo_name}.git", head_branch)
      rescue StandardError
        puts 'Nothing to commit'
      end
      Dir.chdir(pwd)
      `rm -rf '#{repository}'`
    end

    # Read and parse the raw webhook body.
    def get_payload_request(request)
      request.body.rewind
      @payload_raw = request.body.read
      begin
        @payload = JSON.parse @payload_raw
      rescue JSON::ParserError => e
        halt 400, "Invalid JSON (#{e})"
      end
    end

    # Instantiate an Octokit client authenticated as the GitHub App itself
    # (JWT), used to mint installation tokens.
    def authenticate_app
      payload = {
        iat: Time.now.to_i,
        exp: Time.now.to_i + (10 * 60),
        iss: APP_IDENTIFIER
      }
      jwt = JWT.encode(payload, PRIVATE_KEY, 'RS256')
      @app_client ||= Octokit::Client.new(bearer_token: jwt)
    end

    # Instantiate an Octokit client authenticated as the installation,
    # authorized to act on the repositories the app is installed on.
    def authenticate_installation(payload)
      @installation_id = payload['installation']['id']
      @installation_token = @app_client.create_app_installation_access_token(@installation_id)[:token]
      @installation_client = Octokit::Client.new(bearer_token: @installation_token)
    end

    # Verify the webhook came from GitHub. Prefers the SHA-256 signature
    # header; falls back to SHA-1 for compatibility with the tutorial.
    def verify_webhook_signature
      their_signature_header =
        request.env['HTTP_X_HUB_SIGNATURE_256'] ||
        request.env['HTTP_X_HUB_SIGNATURE'] ||
        'sha256='
      method, their_digest = their_signature_header.split('=')
      digest_algo = method == 'sha256' ? 'sha256' : 'sha1'
      our_digest = OpenSSL::HMAC.hexdigest(digest_algo, WEBHOOK_SECRET, @payload_raw)
      halt 401 unless their_digest && Rack::Utils.secure_compare(our_digest, their_digest)

      logger.debug "---- received event #{request.env['HTTP_X_GITHUB_EVENT']}"
      logger.debug "----    action #{@payload['action']}" unless @payload['action'].nil?
    end
  end

  run! if __FILE__ == $PROGRAM_NAME
end
