package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"path/filepath"
	"strconv"
	"time"
)

const (
	MaxFormMemory = 32 << 20 // 32 MB
)

var (
	proxyClient *http.Client = &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
)

// proxyHandler accepts HTTP requests that contain information
// to send a new HTTP request.
func proxyHandler(rsp http.ResponseWriter, rqst *http.Request) {
	reloadConfig()

	err := rqst.ParseMultipartForm(MaxFormMemory)
	if err != nil {
		respondWithError(rsp, err)
		return
	}

	proxyRqst, err := newRequest(rqst.Form)
	if err != nil {
		respondWithError(rsp, err)
		return
	}

	startTime := time.Now()

	proxyRsp, err := proxyClient.Do(proxyRqst)
	if err != nil {
		respondWithError(rsp, err)
		return
	}
	defer proxyRsp.Body.Close()

	body, err := ioutil.ReadAll(proxyRsp.Body)
	if err != nil {
		respondWithError(rsp, err)
		return
	}

	duration := time.Since(startTime)
	formattedDuration := strconv.FormatFloat(duration.Seconds(), 'f', 3, 64) + " sec"

	data := proxyResponse{
		Request: proxyRequest{
			URL:      fmt.Sprintf("%s", proxyRqst.URL),
			Scheme:   proxyRqst.URL.Scheme,
			Host:     proxyRqst.URL.Host,
			Fragment: proxyRqst.URL.Fragment,
			Path:     proxyRqst.URL.Path,
			Query:    proxyRqst.URL.RawQuery,
			Method:   proxyRqst.Method,
			Headers:  proxyRqst.Header,
		},
		Response: proxyResponseResponse{
			StatusCode: proxyRsp.StatusCode,
			Duration:   formattedDuration,
			Time:       time.Now(),
			Body:       string(body),
			Headers:    proxyRsp.Header,
		},
	}

	json, err := json.Marshal(data)
	if err != nil {
		respondWithError(rsp, err)
		return
	}

	rsp.Header().Set("Content-type", "application/json; charset=utf-8")
	fmt.Fprintf(rsp, "%s", json)

	fmt.Printf(
		" -- [REQ] %s %s -> %d, %s\n",
		proxyRqst.Method,
		proxyRqst.URL,
		proxyRsp.StatusCode,
		formattedDuration,
	)
}

// configHandler outputs  a JS config file that configures the browsapi JS app.
func configHandler(rsp http.ResponseWriter, rqst *http.Request) {
	reloadConfig()

	rsp.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	rsp.WriteHeader(200)

	fmt.Fprintf(rsp, "browsapi.Config.setVersion('%s');\n\n", Version)
	fmt.Fprintf(rsp, "browsapi.Config.setRequestLogType('%s');\n\n", template.JSEscapeString(config.RequestLog))

	if len(configPath) > 0 {
		fmt.Fprintf(rsp, "browsapi.Config.setLoadedConfigFileName('%s');\n\n", template.JSEscapeString(filepath.Base(configPath)))
	}

	for name, description := range config.Params {
		fmt.Fprintf(
			rsp,
			"browsapi.Config.setUserOption(new browsapi.UserOption('%s', '%s'));\n",
			template.JSEscapeString(name),
			template.JSEscapeString(description),
		)
	}

	fmt.Fprintf(rsp, "\n")

	for _, host := range config.Servers {
		if host.Ignore {
			continue
		}

		headers, err := json.Marshal(host.GetHeaders())
		if err != nil {
			continue
		}

		fmt.Fprintf(
			rsp,
			"browsapi.Config.setHost('%s', new browsapi.Host('%s', '%s', %s, '%s', '%s'));\n",
			template.JSEscapeString(host.Name),
			template.JSEscapeString(host.GetURL()),
			template.JSEscapeString(host.GetAuth()),
			headers,
			template.JSEscapeString(host.GetUsername()),
			template.JSEscapeString(host.GetPassword()),
		)
	}

	fmt.Fprintf(rsp, "\n")

	for alias, path := range config.Requests {
		fmt.Fprintf(
			rsp,
			"browsapi.Config.setPath('%s', '%s');\n",
			template.JSEscapeString(alias),
			template.JSEscapeString(path),
		)
	}
}

// storageHandler allows saving of
func storageHandler(rsp http.ResponseWriter, rqst *http.Request) {
	ns := rqst.URL.Query().Get("ns")
	storage, found := storages[ns]
	if !found {
		respondWithError(rsp, fmt.Errorf("No storage with name '%s' available.", ns))
		return
	}

	switch rqst.Method {
	case "GET":
		if key := rqst.URL.Query().Get("key"); len(key) > 0 {
			// Return specific key
			item, err := storage.Retrieve(key)

			var value []byte
			if err == nil {
				value = []byte(item.Value)
			} else if err == ErrStorageItemNotFound {
				value = []byte("undefined")
			} else {
				respondWithError(rsp, err)
				return
			}

			rsp.Header().Set("Content-Type", "text/plain; charset=utf-8")
			rsp.WriteHeader(200)
			rsp.Write(value)
		} else {
			// Return all keys
			items, err := storage.RetrieveAll()
			if err != nil {
				respondWithError(rsp, err)
				return
			}

			data := make(map[string]interface{}, len(items))
			for _, item := range items {
				data[item.Key] = item.Value
			}

			encoded, err := json.Marshal(data)
			if err != nil {
				respondWithError(rsp, err)
				return
			}

			rsp.Header().Set("Content-Type", "application/json; charset=utf-8")
			rsp.WriteHeader(200)
			rsp.Write(encoded)
		}
	case "POST":
		key := rqst.FormValue("key")
		value := rqst.FormValue("value")
		storage.Store(&StorageItem{key, value})
		rsp.WriteHeader(200)
	case "DELETE":
		storage.Clear()
		rsp.WriteHeader(200)
	default:
		respondWithError(rsp, fmt.Errorf("Unsupported HTTP method: %s", rqst.Method))
	}

}
