Signing identity note

Commits are signed with GPG key 2E9F0DE1DF63189A, whose only identity is
help@marketingtool.pro. Commits authored as the GitHub noreply address show
as "Unverified" even though the signature is good, because GitHub requires the
committer email to be an identity on the signing key.

user.email is therefore set to help@marketingtool.pro in both global and repo
config. Do not set it back to the noreply address without first adding that
address as a UID on the key.
