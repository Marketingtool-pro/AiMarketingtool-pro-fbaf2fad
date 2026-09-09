package main

import (
	"os"

	"github.com/cli/cli/v2/internal/ghcmd"
)

func main() {
	code := ghcmd.Master()
	os.Exit(int(code))
}
