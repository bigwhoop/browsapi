# Browsa Pi

Browsa Pi is a configurable API browser that runs on your local computer and is accessible using
a neat little web interface.

![Screenshot](https://raw.github.com/bigwhoop/browsapi/master/screenshot.png)

## Features

 * Easy setup
 * Per-project configuration
 * Cross-origin access
 * (Persistent) Request Log
 * JSON inspector


## Installation

I assume you've installed *go* and properly configured your `GOPATH` environment variable.

### *nix

    go get -u github.com/bigwhoop/browsapi
    cd $GOPATH\src\github.com\bigwhoop\browsapi
    git submodule init && git submodule update

### Windows

    go get -u github.com/bigwhoop/browsapi
    cd %GOPATH%/src/github.com/bigwhoop/browsapi
    git submodule init && git submodule update


## Usage

If your `GOPATH`'s `bin` directory is in the `PATH` environment variable, all it takes
is to call the `browsapi` binary.

    browsapi

This will output something along these lines:

    Browsa Pi v0.9.0
    
       Config file : none
      Static files : D:\go\src\github.com\bigwhoop\browsapi\www
               URL : http://localhost:8686/

You can then go to [http://localhost:8686/](http://localhost:8686/) and start making requests.


### Using a configuration file

The format of configuration files is JSON. Here is an example with all available options.

    {
        "server": {
            "port": 8600,
            "request_log": "client"
        },
        "client": {
            "endpoints": {
                "Development": {
                    "host": "https://api.example.dev",
                    "headers": {
                        "Accept": "application/json",
                        "Accept-Language": "en"
                    }
                },
                "Production": {
                    "extend": "Development",
                    "host": "https://api.example.com",
                    "auth": "basic",
                    "username": "foo",
                    "password": "bar"
                }
            },
            "paths": {
                "Features List": "/features",
                "User status": "/user/me/status",
                "Administrator details": "/user/admin/details"
            }
        }
    }

The `server.request_log` directive can be one of the following:

* `client` to use the browser's localStorage capabilities.
* `server` to store the data in a file on the server. The file must be specified using `server.request_log_path`.
* `memory` to only store the log as long as the browser is not reloaded.

To use a config file, just pass the path to it as the first argument to the binary.

    browsapi /path/to/browsapi.json


### JSON inspector

Please refer to the [jquery.jsonbrowser.js](https://github.com/bigwhoop/jquery.jsonbrowser.js) README.


## TODOs

 * Cross-browser testing
 * Tests ...
 * Statistics


## License

MIT "Expat". See LICENSE file.