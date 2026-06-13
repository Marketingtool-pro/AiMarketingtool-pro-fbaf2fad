source_url=${args[source]}
force=${args[--force]}

if [[ $force ]]; then
  echo "downloading $source_url with --force"
else
  echo "downloading $source_url"
fi
