package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
)

const (
	// The default port for the Go web services
	DefaultPort = 8686

	// The name/path of the default config file
	DefaultConfigFile = "browsapi.json"

	NoAuth    = "none"
	BasicAuth = "basic"

	RequestLogMemory = "memory"
	RequestLogClient = "client"
	RequestLogServer = "server"
)

var (
	// The path to the loaded config file
	configPath = ""

	// The default config object
	defaultConfig = NewConfig()

	// The global config object
	config = defaultConfig
)

// NewConfig creates a new config with all fields initializes
func NewConfig() *Config {
	return &Config{
		Port:       DefaultPort,
		RequestLog: RequestLogMemory,
		Params:     make(ParamsConfig, 0),
		Servers:    make(ServersConfig, 0),
		Requests:   make(RequestsConfig, 0),
	}
}

// Config is the main configuration struct
type Config struct {
	// The port, where Browsa Pi will listen on.
	Port int `json:"port,omitempty"`

	// Can either be 'server', 'client' or 'memory'.
	RequestLog string `json:"request_log,omitempty"`

	// If RequestLog is 'server', this directive specifies the file,
	// where the server stores the log.
	RequestLogPath string `json:"request_log_path,omitempty"`

	// User params that can be used in server and request configurations.
	Params ParamsConfig `json:"params,omitempty"`

	Servers  ServersConfig  `json:"servers,omitempty"`
	Requests RequestsConfig `json:"requests,omitempty"`
}

// GetPort returns the user-specified port, or the default port
// if no custom port was configured.
func (this Config) GetPort() int {
	if this.Port > 0 {
		return this.Port
	}
	return DefaultPort
}

// ReadFile reads a JSON file into the Config struct
func (this *Config) ReadFile(path string) error {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return errors.New(fmt.Sprintf("Failed to load config file '%s': %s", path, err.Error()))
	}

	err = json.Unmarshal(data, this)
	if err != nil {
		return errors.New(fmt.Sprintf("Config file '%s' seems to contain invalid JSON: %s", path, err.Error()))
	}

	return nil
}

// CreateFile creates a config file with a default structure at the
// given location. An error is returned if the file already exists.
func (this *Config) CreateFile(path string) error {
	if _, err := os.Stat(path); err == nil {
		return errors.New(fmt.Sprintf("Config file '%s' already exists.\nUse 'browsapi %s' to start the server.", path, path))
	}

	bytes, err := json.MarshalIndent(defaultConfig, "", "  ")
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile(path, bytes, os.FileMode(0755)); err != nil {
		return errors.New(fmt.Sprintf("Failed to write config file '%s': %s", path, err.Error()))
	}

	return nil
}

type ParamsConfig map[string]string

type ServersConfig map[string]*ServerConfig

type ServerConfig struct {
	Ignore   bool              `json:"ignore",omitempty`
	Extend   string            `json:"extend,omitempty"`
	Name     string            `json:"name,omitempty"`
	URL      string            `json:"url,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
	Auth     string            `json:"auth,omitempty"`
	AuthURL  string            `json:"auth_url,omitempty"`
	AuthPost string            `json:"auth_post,omitempty"`
	Username string            `json:"username,omitempty"`
	Password string            `json:"password,omitempty"`
}

// getParent tries to find the parent of this host, specified by the Extend field.
func (this ServerConfig) getParent() *ServerConfig {
	return config.Servers[this.Extend]
}

func (this ServerConfig) GetURL() string {
	if len(this.URL) > 0 {
		return this.URL
	}
	p := this.getParent()
	if p != nil {
		return p.GetURL()
	}
	return ""
}

func (this ServerConfig) GetHeaders() map[string]string {
	if len(this.Headers) > 0 {
		return this.Headers
	}
	p := this.getParent()
	if p != nil {
		return p.GetHeaders()
	}
	return make(map[string]string, 0)
}

// GetAuth returns the used auth type
func (this ServerConfig) GetAuth() string {
	if len(this.Auth) > 0 {
		return this.Auth
	}
	p := this.getParent()
	if p != nil {
		return p.GetAuth()
	}
	return ""
}

func (this ServerConfig) GetUsername() string {
	if len(this.Username) > 0 {
		return this.Username
	}
	p := this.getParent()
	if p != nil {
		return p.GetUsername()
	}
	return ""
}

func (this ServerConfig) GetPassword() string {
	if len(this.Password) > 0 {
		return this.Password
	}
	p := this.getParent()
	if p != nil {
		return p.GetPassword()
	}
	return ""
}

type RequestsConfig map[string]string

/*type RequestsConfig map[string]*RequestConfig

type RequestConfig struct {
	Path      string            `json:"url,omitempty"`
	Server    string            `json:"url,omitempty"`
}*/

// reloadConfig tries to reload the configuration file passed on start-up. If the config file
// is not loadable the old configuration will not be overwritten.
func reloadConfig() error {
	if len(configPath) == 0 {
		return nil
	}

	newConfig := NewConfig()
	if err := newConfig.ReadFile(configPath); err != nil {
		fmt.Printf(" -- [ERR] Failed to reload config file. Using old config. Error: %s\n", err.Error())
		return err
	}
	config = newConfig
	return nil
}
