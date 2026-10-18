# frozen_string_literal: true

# Validation for the environment-provided values the App Store Connect scripts
# use to read files and build API paths.
#
# Without it, ASC_KEY_PATH / ASC_PRIVATE_KEY_PATH (and ASC_KEY_ID, which is
# interpolated into the default key file name) could point File.read at any file
# on the machine ("../../etc/..." or an absolute path), and IDs such as
# ASC_APP_ID or BUILD_NUMBER could inject "../" segments into the App Store
# Connect API path. Everything is now checked before it is used:
#
#   * key files must be .p8 regular files whose real path (symlinks resolved)
#     lies inside the repository root or Apple's standard key directories;
#   * IDs must match the shape Apple issues (numeric app/subscription ids,
#     alphanumeric key ids, dotted numeric build numbers).
module AscSafeInput
  REPO_ROOT = File.expand_path('../..', __dir__)

  # Where App Store Connect keys are allowed to live: the repo root (CI writes
  # AuthKey_<id>.p8 there) and the directories Apple's own tools search.
  KEY_DIRS = [
    REPO_ROOT,
    File.join(Dir.home, '.appstoreconnect', 'private_keys'),
    File.join(Dir.home, '.private_keys'),
    File.join(Dir.home, 'private_keys')
  ].freeze

  module_function

  # Resolve +raw+ (relative to +relative_to+) and return its real path, or abort
  # if it is not a .p8 file inside one of KEY_DIRS.
  def key_path(raw, relative_to: Dir.pwd)
    expanded = File.expand_path(clean_key_input(raw), relative_to)
    ensure_p8_file(expanded)
    real = File.realpath(expanded)
    ensure_allowed_key_dir(real, expanded)
    real
  end

  def clean_key_input(raw)
    value = raw.to_s.strip
    abort 'ASC key path is empty.' if value.empty?
    abort 'ASC key path contains a NUL byte.' if value.include?("\0")
    value
  end

  def ensure_p8_file(expanded)
    abort "ASC key must be a .p8 file: #{expanded}" unless File.extname(expanded) == '.p8'
    abort "ASC key not found or not a regular file: #{expanded}" unless File.file?(expanded)
  end

  # +real+ has symlinks resolved, so a link pointing outside is rejected too.
  def ensure_allowed_key_dir(real, expanded)
    allowed = KEY_DIRS.select { |dir| File.directory?(dir) }.map { |dir| File.realpath(dir) }
    return if allowed.any? { |base| real.start_with?(base + File::SEPARATOR) }

    abort "Refusing to read an ASC key outside the allowed directories (#{KEY_DIRS.join(', ')}): #{expanded}"
  end

  # Abort unless +value+ fully matches +pattern+; return the value otherwise.
  def id!(name, value, pattern)
    text = value.to_s.strip
    abort "Invalid #{name}: #{text.inspect} (expected #{pattern.source})" unless pattern.match?(text)
    text
  end

  def numeric_id!(name, value) = id!(name, value, /\A\d{1,20}\z/)
  def key_id!(name, value) = id!(name, value, /\A[A-Za-z0-9]{1,32}\z/)
  def build_number!(name, value) = id!(name, value, /\A\d{1,10}(?:\.\d{1,10}){0,2}\z/)
end
