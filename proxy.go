package main

import (
	"net/http"
	"net/url"
	"strings"
	"time"
)

// extractMapFromRequestParam combines request params with the same
// prefix into a map.
//
// If params is a map like this:
//
//   map[string]string{
//       "headers[foo]": "bar",
//       "headers[baz]": "boz",
//   }
//
// The result for key 'headers' would be:
// 
//   map[string]string{
//       "foo": "bar",
//       "baz": "boz",
//   }
func extractMapFromRequestParam(key string, params url.Values) map[string]string {
	a := make(map[string]string, 0)
	for k, _ := range params {
		if strings.Index(k, key+"[") == 0 {
			a[k[strings.Index(k, "[")+1:strings.Index(k, "]")]] = params.Get(k)
		}
	}
	return a
}

// newRequest takes the form arguments from one HTTP requests
// to initialize and configure a new HTTP request.
func newRequest(data url.Values) (*http.Request, error) {
	rqst, err := http.NewRequest(data.Get("method"), data.Get("url"), nil)
	if err != nil {
		return nil, err
	}

	for k, v := range extractMapFromRequestParam("headers", data) {
		rqst.Header.Set(k, v)
	}

	switch data.Get("auth") {
	case "basic":
		rqst.SetBasicAuth(data.Get("username"), data.Get("password"))
	}

	return rqst, nil
}

type proxyResponse struct {
	Request  proxyRequest          `json:"request"`
	Response proxyResponseResponse `json:"response"`
}

type proxyResponseResponse struct {
	StatusCode int         `json:"status_code"`
	Duration   string      `json:"duration"`
	Time       time.Time   `json:"time"`
	Headers    http.Header `json:"headers"`
	Body       string      `json:"body"`
}

type proxyRequest struct {
	URL      string      `json:"url"`
	Scheme   string      `json:"scheme"`
	Host     string      `json:"host"`
	Fragment string      `json:"fragment"`
	Path     string      `json:"path"`
	Query    string      `json:"query"`
	Method   string      `json:"method"`
	Headers  http.Header `json:"headers"`
	PostData url.Values  `json:"post_data"`
}
