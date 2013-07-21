package main

import (
	"flag"
	"fmt"
	"go/build"
	"net/http"
	"os"
	"path/filepath"
)

const (
	Version = "0.9.0"

	// Will be used to find the "www" data directory
	PkgPath = "github.com/bigwhoop/browsapi"
)

func respondWithError(rsp http.ResponseWriter, err error) {
	rsp.WriteHeader(500)
	fmt.Fprintf(rsp, err.Error())
	fmt.Printf(" -- [ERR] %s\n", err.Error())
}

func main() {
	init := flag.Bool("init", false, "Set this flag to create a default config file structure.")
	flag.Parse()

	configPath = flag.Arg(0)

	// If --init is passed, we create a new config file at the path specified by configPath
	if *init {
		if err := config.CreateFile(configPath); err != nil {
			fmt.Printf("Failed to create config file.\nError: %s\n", err.Error())
			os.Exit(1)
		}
		fmt.Printf("Config file '%s' successfully created.\n\n", configPath)
	}

	if len(configPath) > 0 {
		var err error
		if err = config.ReadFile(configPath); err != nil {
			fmt.Printf("Failed to load config file.\nError: %s\n", err.Error())
			os.Exit(1)
		}

		configPath, err = filepath.Abs(configPath)
		if err != nil {
			panic(err)
		}
	} else {
		var err error
		if err = config.ReadFile(DefaultConfigFile); err == nil {
			configPath, err = filepath.Abs(configPath)
			if err != nil {
				panic(err)
			}
		}
	}

	// Create request log
	if len(config.RequestLogPath) > 0 {
		storage, err := NewFileStorage(config.RequestLogPath)
		if err != nil {
			fmt.Printf("Failed to create/load request log.\nError: %s\n", err.Error())
			os.Exit(1)
		}
		storages[RequestLogNS] = storage
	}

	// We have to find the path to this package's source because the static data
	// will not be packaged with the binary.
	pkgInfo, err := build.Import(PkgPath, "", 0)
	if err != nil {
		panic(err)
	}
	webDir := filepath.Join(pkgInfo.Dir, "www")

	mux := http.NewServeMux()
	mux.HandleFunc("/proxy", proxyHandler)
	mux.HandleFunc("/config.js", configHandler)
	mux.HandleFunc("/storage", storageHandler)
	mux.Handle("/", http.FileServer(http.Dir(webDir)))

	configPathName := configPath
	if len(configPathName) == 0 {
		configPathName = "none"
	}

	fmt.Printf(
		"Browsa Pi v%s\n\n   Config file : %s\n  Static files : %s\n           URL : http://localhost:%d/\n\n",
		Version, configPathName, webDir, config.GetPort(),
	)

	http.ListenAndServe(fmt.Sprintf(":%d", config.GetPort()), mux)
}
