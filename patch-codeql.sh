sed -i.bak '/- language: java-kotlin/{N;s/build-mode: autobuild/build-mode: none/}' .github/workflows/codeql.yml
