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
)

var (
	// The path to the loaded config file
	configPath = ""

	// The default config object
	defaultConfig = &Config{
		Server: &ServerConfig{
			Port:       DefaultPort,
			RequestLog: "client",
		},
		Client: &ClientConfig{
			Endpoints: make(map[string]*EndpointConfig, 0),
		},
	}

	// The global config object
	config = defaultConfig
)

// NewConfig creates a new config with all pointers initializes
func NewConfig() *Config {
	return &Config{
		Server: &ServerConfig{},
		Client: &ClientConfig{
			Endpoints: make(map[string]*EndpointConfig, 0),
		},
	}
}

// Config is the main configuration struct
type Config struct {
	Server *ServerConfig `json:"server,omitempty"`
	Client *ClientConfig `json:"client,omitempty"`
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

// ServerConfig holds the configuration for the Go web service.
type ServerConfig struct {
	// The port, where Browsa Pi will listen on.
	Port int `json:"port,omitempty"`

	// Can either be 'server', 'client' or 'memory'.
	RequestLog string `json:"request_log,omitempty"`

	// If RequestLog is 'server', this directive specifies the file,
	// where the server stores the log.
	RequestLogPath string `json:"request_log_path,omitempty"`
}

// GetPort returns the user-specified port, or the default port
// if no custom port was configured.
func (this ServerConfig) GetPort() int {
	if this.Port > 0 {
		return this.Port
	}
	return DefaultPort
}

// ClientConfig holds the configuration for the JS app.
type ClientConfig struct {
	Endpoints map[string]*EndpointConfig `json:"endpoints,omitempty"`
	Paths     map[string]string          `json:"paths,omitempty"`
}

type EndpointConfig struct {
	Ignore   bool              `json:"ignore",omitempty`
	Extend   string            `json:"extend,omitempty"`
	Host     string            `json:"host,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
	Auth     string            `json:"auth,omitempty"`
	Username string            `json:"username,omitempty"`
	Password string            `json:"password,omitempty"`
}

// getParent tries to find the parent of this endpoint,
// specified by the Extend field.
func (this EndpointConfig) getParent() *EndpointConfig {
	return config.Client.Endpoints[this.Extend]
}

func (this EndpointConfig) GetHost() string {
	if len(this.Host) > 0 {
		return this.Host
	}
	p := this.getParent()
	if p != nil {
		return p.GetHost()
	}
	return ""
}

func (this EndpointConfig) GetHeaders() map[string]string {
	if len(this.Headers) > 0 {
		return this.Headers
	}
	p := this.getParent()
	if p != nil {
		return p.GetHeaders()
	}
	return make(map[string]string, 0)
}

func (this EndpointConfig) GetAuth() string {
	if len(this.Auth) > 0 {
		return this.Auth
	}
	p := this.getParent()
	if p != nil {
		return p.GetAuth()
	}
	return ""
}

func (this EndpointConfig) GetUsername() string {
	if len(this.Username) > 0 {
		return this.Username
	}
	p := this.getParent()
	if p != nil {
		return p.GetUsername()
	}
	return ""
}

func (this EndpointConfig) GetPassword() string {
	if len(this.Password) > 0 {
		return this.Password
	}
	p := this.getParent()
	if p != nil {
		return p.GetPassword()
	}
	return ""
}

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
