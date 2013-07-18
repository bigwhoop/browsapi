var browsapi = {
    Config: {
        version        : '',
        configFilePath : '',
        requestLogType : '',
        endpoints      : {},
        paths          : {},
        timeFormat     : 'HH:mm:ss',
        dateFormat     : 'MMMM Do YYYY',

        /**
         * @param {String} version
         */
        setVersion: function(version) {
            this.version = version;
        },

        /**
         * @param {String} type
         */
        setRequestLogType: function(type) {
            this.requestLogType = type;
        },

        /**
         * @param {String} path
         */
        setLoadedConfigFileName: function(path) {
            this.configFilePath = path;
        },

        /**
         * @param {String} alias
         * @param {String} endpoint
         */
        setEndpoint: function(alias, endpoint) {
            this.endpoints[alias] = endpoint;
            return this;
        },

        /**
         * @param {String} alias
         * @param {String} path
         */
        setPath: function(alias, path) {
            this.paths[alias] = path;
            return this;
        }
    },
    

    /**
     * @param {String} host
     * @param {String} auth      Either 'none' or 'basic'
     * @param {Object} headers   Key/value map
     * @param {String} username  Username to use with basic auth
     * @param {String} password  Password to use with basic auth
     * @constructor
     */
    Endpoint: function(host, auth, headers, username, password) {
        var endpoint      = this;
        endpoint.host     = host;
        endpoint.auth     = auth;
        endpoint.headers  = headers;
        endpoint.username = username;
        endpoint.password = password;
    },
    
    
    /**
     * @param {String} method
     * @param {browsapi.Endpoint} endpoint
     * @param {String} path
     * @constructor
     */
    Request: function(method, endpoint, path) {
        var rqst = this;
        rqst.method   = method;
        rqst.path     = path;
        rqst.endpoint = endpoint;

        /**
         * @returns {String}
         */
        rqst.getFullURL = function() {
            return rqst.endpoint.host + rqst.path;
        };

        /**
         * @returns {Object}
         */
        rqst.getParams = function() {
            return {
                url      : rqst.endpoint.host + rqst.path,
                method   : rqst.method,
                auth     : rqst.endpoint.auth,
                headers  : rqst.endpoint.headers,
                username : rqst.endpoint.username,
                password : rqst.endpoint.password
            };
        };
    },


    /**
     * The error overlay.
     *
     * @constructor
     */
    ErrorView: function() {
        var view = this;
        
        var $error = $('#error');

        /**
         * @param {String} msg
         */
        view.showMessage = function(msg) {
            $error.empty().html(msg);
            $error.fadeIn();
            window.setTimeout(function() {
                $error.fadeOut();
            }, 5000);
        };

        $error.on('click', function() {
            $error.fadeOut();
        });
    },


    /**
     * The loading icon.
     *
     * @constructor
     */
    LoaderView: function() {
        var view = this;

        var $notice = $('#loading_notice');
        
        view.show = function() {
            $notice.show();
        };
        
        view.hide = function() {
            $notice.hide();
        };
    },


    /**
     * The overlay element.
     */
    OverlayView: {
        $overlay: $('#overlay'),
        
        show: function(onClick) {
            if ($.isFunction(onClick)) {
                this.$overlay.on('click', onClick);
            }
            this.$overlay.show();
        },
        
        hide: function() {
            this.$overlay.unbind('click');
            this.$overlay.hide();
        },
    },


    /**
     * @param {jQuery} $element
     * @constructor
     */
    DialogView: function($element) {
        var view = this;
        
        $element.addClass('dialog');
        
        view.show = function() {
            browsapi.OverlayView.show(function() {
                view.hide();
            });
            
            $element.show();
            view.center();
        };

        view.hide = function() {
            $element.hide();
            browsapi.OverlayView.hide();
        };

        view.center = function() {
            $element.css({
                top  : $(window).height()  / 2 - $element.outerHeight(true) / 2,
                left : $(window).width() / 2 - $element.outerWidth(true) / 2
            });
        };
    },
    
    
    HeaderDialogView: function() {
        var view = this;
        
        var $dlg   = $('#conf_header_dlg');
        var $key   = $('#conf_header_dlg_key');
        var $value = $('#conf_header_dlg_value');
        var $save  = $dlg.find('button');
        
        var dlg  = new browsapi.DialogView($dlg);

        view.show = function(key, value, onSave) {
            $key.val(key);
            $value.val(value);
            dlg.show();
            
            if ($.isFunction(onSave)) {
                var wrappedOnSave = function() {
                    onSave(key, $key.val(), $value.val());
                    view.hide();
                };
                
                $save.on('click', wrappedOnSave);
                $dlg.find('input').on('keyup', function(e) {
                    if (e.keyCode == 13) {
                        wrappedOnSave();
                        e.stopPropagation();
                    }
                })
            }
        };
        
        view.hide = function() {
            dlg.hide();
            $save.unbind('click');
        };

        view.focusKey = function() {
            $key.focus();
        };

        view.focusValue = function() {
            $value.focus();
        };
    },


    /**
     * The configurator section.
     *
     * @param {browsapi.App} app
     * @param {browsapi.ErrorView} errorView
     * @constructor
     */
    ConfiguratorView: function(app, errorView) {
        var view = this;
        
        var $sectionConfig      = $('#configuration');
        var $confMethod         = $sectionConfig.find('#conf_method');
        var $confSend           = $sectionConfig.find('#conf_send');
        var $confAuth           = $sectionConfig.find('#conf_auth');
        var $confBasicAuth      = $sectionConfig.find('#auth_basic');
        var $confBasicAuthUser  = $sectionConfig.find('#auth_basic_user');
        var $confBasicAuthPass  = $sectionConfig.find('#auth_basic_pass');

        var headersView = new browsapi.HeadersConfiguratorView();
        var hostView    = new browsapi.HostConfiguratorView(view);
        var pathView    = new browsapi.PathConfiguratorView();

        view.showEndpoint = function(endpoint) {
            headersView.setHeaders(endpoint.headers);
            hostView.setValue(endpoint.host);

            if (endpoint.auth == 'basic') {
                $confAuth.val(endpoint.auth);
                $confBasicAuthUser.val(endpoint.username);
                $confBasicAuthPass.val(endpoint.password);
            }
        };

        var onAuthTypeChanged = function() {
            $confBasicAuth.hide();
            switch ($confAuth.val())
            {
                case 'basic':
                    $confBasicAuth.show();
                    break;
            }
        };

        var onReturnKeyPressed = function(e) {
            if (e.keyCode == 13) {
                $confSend.trigger('click');
            }
        };

        var onSendButtonClicked = function() {
            var host = hostView.getValue();
            if (!host.length) {
                errorView.showMessage('Please specify a host.');
                return;
            }
            
            var request = new browsapi.Request(
                $confMethod.val(),
                new browsapi.Endpoint(
                    host,
                    $confAuth.val(),
                    headersView.getHeaders(),
                    $confBasicAuthUser.val(),
                    $confBasicAuthPass.val()
                ),
                pathView.getNormalizedValue()
            );
            
            app.makeRequest(request);
        };

        $confAuth.on('change', onAuthTypeChanged);
        $confAuth.trigger('change');

        $sectionConfig.on('keyup', 'input', onReturnKeyPressed);
        $confSend.on('click', onSendButtonClicked);
        
        $sectionConfig.on('click', '.selector', function() {
            var $selector   = $(this),
                selectorPos = $selector.position(),
                $selection  = $selector.find('+ .selection');
            
            $selection.css({
                top  : selectorPos.top + $selector.height(),
                left : selectorPos.left + $selector.width() / 2 - $selection.width() / 2
            });
            
            $selector.toggleClass('active-selector')
            $selection.toggle();
        });
    },


    /**
     * The headers configurator.
     *
     * @constructor
     */
    HeadersConfiguratorView: function() {
        var view = this;
        
        var $confHeaders      = $('#conf_headers');
        var $confHeaderValues = $confHeaders.find('.headers');
        var $confAddHeader    = $confHeaders.find('> a');

        /**
         * @param {String} key
         * @param {String} value
         * @returns {jQuery}
         */
        var createHeaderElement = function(key, value) {
            var $header = $('<a href="#"><span>' + key + ':</span> ' + value + '</a>');
            $header.data('key', key);
            $header.data('value', value);
            return $header;
        };

        /**
         * @param {Object} headers
         */
        view.setHeaders = function(headers) {
            $confHeaderValues.empty();
            for (var key in headers) {
                var $header = createHeaderElement(key, headers[key])
                $confHeaderValues.append($header).append(' ');
            }
        };

        /**
         * @returns {Object}
         */
        view.getHeaders = function() {
            var headers = {};
            $confHeaderValues.find('a').each(function() {
                var key   = $(this).data('key'),
                    value = $(this).data('value');
                if (key.length && value.length) {
                    headers[key] = value;
                }
            });
            return headers;
        };
        
        var addOrUpdateHeader = function(oldKey, key, value) {
            var headers = view.getHeaders();
            
            if (key.length == 0 || oldKey != key) {
                delete headers[oldKey];
            }
            
            if (key.length > 0) {
                headers[key] = value;
            }
            
            view.setHeaders(headers);
        };

        var dlg = new browsapi.HeaderDialogView();
        
        $confHeaderValues.on('click', 'a', function(e) {
            e.preventDefault();
            var $a = $(this);
            dlg.show($a.data('key'), $a.data('value'), addOrUpdateHeader);
            dlg.focusValue();
        });
        
        $confAddHeader.on('click', function(e) {
            e.preventDefault();
            dlg.show('', '', addOrUpdateHeader);
            dlg.focusKey();
        });
    },


    /**
     * The host configurator.
     *
     * @param {browsapi.ConfiguratorView} configuratorView
     * @constructor
     */
    HostConfiguratorView: function(configuratorView) {
        var view = this;

        var $host = $('#conf_host');
        var $endpoints = $('#conf_endpoints');

        /**
         * @param {String} host
         */
        view.setValue = function(host) {
            $host.val(host);
        };

        /**
         * @returns {String}
         */
        view.getValue = function() {
            return $host.val();
        };

        var endpoints = browsapi.Config.endpoints;
        if (Object.keys(endpoints).length > 0) {
            $host.addClass('has-selector');
            $endpoints.append('<ul></ul>');
        } else {
            $host.find('+ .selector').hide();
        }

        var createShowEndpointHandler = function(endpoint) {
            return function() {
                configuratorView.showEndpoint(endpoint);
                
                // Hide selector
                $(this).parents('.selection').prev('.selector').trigger('click');
            };
        };

        for (var alias in endpoints) {
            var $li = $('<li></li>');
            $li.text(alias);
            $li.on('click', createShowEndpointHandler(endpoints[alias]));
            $endpoints.find('ul').append($li);
        }
    },


    /**
     * The path configurator.
     *
     * @constructor
     */
    PathConfiguratorView: function() {
        var view = this;

        var $confPath  = $('#conf_path');
        var $confPaths = $('#conf_paths');
        
        /**
         * @param {String} path
         */
        view.setValue = function(path) {
            $confPath.val(path);
        };
        
        /**
         * @returns {String}
         */
        view.getValue = function() {
            return $confPath.val();
        };

        /**
         * @returns {String}
         */
        view.getNormalizedValue = function() {
            var path = view.getValue();
            if (!path.length || path[0] != '/') {
                path = '/' + path;
            }
            return path;
        };

        /**
         * @param {String} path
         * @returns {Function}
         */
        var createShowPathHandler = function(path) {
            return function() {
                view.setValue(path);
                
                // Hide selector
                $(this).parents('.selection').prev('.selector').trigger('click');
            };
        };
        
        var paths = browsapi.Config.paths;
        if (Object.keys(paths).length > 0) {
            $confPath.addClass('has-selector');
            $confPaths.append('<ul></ul>');
        } else {
            $confPath.find('+ .selector').hide();
        }
        
        for (var alias in paths) {
            var $li = $('<li></li>');
            $li.text(alias);
            $li.on('click', createShowPathHandler(paths[alias]));
            $confPaths.find('ul').append($li);
        }
    },


    /**
     * The request section.
     *
     * @param {browsapi.App} app
     * @constructor
     */
    RequestView: function(app) {
        var view = this;
        
        var $sectionRequest = $('#request');
        var $rqstMethod     = $sectionRequest.find('.method');
        var $rqstScheme     = $sectionRequest.find('.scheme');
        var $rqstHost       = $sectionRequest.find('.host');
        var $rqstPath       = $sectionRequest.find('.path');
        var $rqstQuery      = $sectionRequest.find('.query');
        var $rqstHeaders    = $sectionRequest.find('table');
        
        view.hide = function() {
            $sectionRequest.hide();
        };

        /**
         * @param {Object} data     Expected keys: method, scheme, host, path, query, headers
         */
        view.setResponseData = function(data) {
            $rqstMethod.html(data.method);
            $rqstScheme.html(data.scheme);
            $rqstHost.html(data.host);
            $rqstPath.html(data.path);
            $rqstQuery.html(data.query.length > 0 ? data.query : '-');
            app.addHeadersToTable($rqstHeaders.find('tbody'), data.headers);
            $sectionRequest.show();
        };
    },


    /**
     * The request log.
     *
     * @param {Object} requestLogStore
     * @constructor
     */
    RequestLogView: function(requestLogStore) {
        var view = this;

        var $container = $('#request_log');
        var $tbody     = $container.find('tbody');
        var $clearBtn  = $container.find('.clear-log');

        view.show = function() {
            $container.show();
        };
        
        view.hide = function() {
            $container.hide();
        };
        
        view.clearEntries = function() {
            $tbody.empty();
            view.hide();
        };
        
        /**
         * @param {Object} response             The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         * @param {Function} onClick            The function to invoke when the log entry is clicked.
         */
        view.addEntry = function(response, request, onClick) {
            var $a = $('<a href="#" title="' + request.getFullURL() + '">' + request.path + '</a>');
            $a.on('click', function(e) {
                e.preventDefault();
                onClick(response, request);
            });
            
            var time = moment(response.response.time);
            var dateStr = time.format(browsapi.Config.dateFormat);
            var timeStr = time.format(browsapi.Config.timeFormat);
            
            var $tr = $('<tr></tr>');
            $tr.addClass(response.response.status_code == 200 ? 'success' : 'failure');
            $tr.append(
                '<td class="nowrap" title="' + dateStr + ' ' + timeStr + '">'
                + (moment().isSame(time, 'day') ? timeStr : dateStr)
                + '</td>'
            );
            $tr.append($('<td>' + request.method + ' </td>').append($a));
            $tr.append('<td>' + response.response.status_code + '</td>')
            $tbody.prepend($tr);
            
            view.show();
        };

        $clearBtn.on('click', function(e) {
            e.preventDefault();
            requestLogStore.clear(function() {
                view.clearEntries();
            });
        });
    },


    /**
     * The response section.
     * 
     * @param {browsapi.App} app
     * @constructor
     */
    ResponseView: function(app) {
        var view = this;
        
        var $sectionResponse    = $('#response');
        var $rspStatusCode      = $sectionResponse.find('.status-code');
        var $rspDuration        = $sectionResponse.find('.duration');
        var $rspTime            = $sectionResponse.find('.time');
        var $rspReload          = $sectionResponse.find('.reload');
        var $rspHeaders         = $sectionResponse.find('table');
        var $rspBodyJson        = $sectionResponse.find('.json');
        var $rspBodyJsonBrowser = $rspBodyJson.find('.jsonbrowser');
        //var $rspBodyJsonSearch  = $rspBodyJson.find('#json_search');
        var $rspBodyRaw         = $sectionResponse.find('.rawbody');

        view.hide = function() {
            $sectionResponse.hide();
        };

        /**
         * @param {Object} data                 The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         */
        view.setResponseData = function(data, request) {
            $rspStatusCode.text(data.status_code);
            $rspDuration.text(data.duration);
            $rspTime.text(moment(data.time).format(browsapi.Config.dateTimeFormat));
            $rspBodyRaw.html(app.escapeHTML(data.body).replace(/\r/g, '').replace(/\n/g, '<br>'));
            app.addHeadersToTable($rspHeaders.find('tbody'), data.headers);
            
            try {
                var bodyData = JSON.parse(data.body);
                $rspBodyJsonBrowser.jsonbrowser(bodyData);
                $rspBodyJson.show();
                //$rspBodyJsonSearch.trigger('keyup');
            } catch (e) {
                $rspBodyJson.hide();
            }
            
            if (data.status_code == 200) {
                $rspStatusCode.addClass('status-success').removeClass('status-failure');
            } else {
                $rspStatusCode.addClass('status-failure').removeClass('status-success');
            }

            $rspReload.unbind('click').on('click', function() {
                app.makeRequest(request);
            });
            
            $sectionResponse.show();
        };

        $sectionResponse.on('click', '.collapse-all', function(e) {
            e.preventDefault();
            $.jsonbrowser.collapseAll($sectionResponse.find('.jsonbrowser'));
        });

        $sectionResponse.on('click', '.expand-all', function(e) {
            e.preventDefault();
            $.jsonbrowser.expandAll($sectionResponse.find('.jsonbrowser'));
        });

        $sectionResponse.on('keyup', '#json_search', function(e) {
            e.preventDefault();
            $.jsonbrowser.search($sectionResponse.find('.jsonbrowser'), $(this).val());
        });
    },
    

    App: function() {
        var app = this;
        
        var $container = $('#browsapi');
        var $h1        = $container.find('header h1');

        var requestLogStore = new browsapi.Storage(browsapi.Config.requestLogType, 'request-log');

        var errorView        = new browsapi.ErrorView();
        var loaderView       = new browsapi.LoaderView();
        var configuratorView = new browsapi.ConfiguratorView(app, errorView);
        var requestView      = new browsapi.RequestView(app);
        var requestLogView   = new browsapi.RequestLogView(requestLogStore);
        var responseView     = new browsapi.ResponseView(app);
        
        /**
         * @param {jQuery} $tbody
         * @param {Object} headers      Key/value map
         */
        app.addHeadersToTable = function($tbody, headers) {
            $tbody.empty();
            for (var key in headers) {
                var $tr = $('<tr></tr>');
                $tr.append('<td>' + key + '</td>');
                $tr.append('<td><code>' + headers[key].join(', ') + '</code></td>');
                $tbody.append($tr);
            }
        };

        var minimizeContainer = function() {
            $container.animate({ marginTop: '-138' }, 800);
        };

        /**
         * @param {String} html
         * @returns {String}
         */
        app.escapeHTML = function(html) {
            return $('<div>').text(html).html();
        };

        /**
         * @param {Object} response             The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         */
        var onLogEntryClicked = function(response, request) {
            requestView.setResponseData(response.request);
            responseView.setResponseData(response.response, request);
        };

        /**
         * @param {Object} response             The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         */
        var onRequestDone = function(response, request) {
            requestView.setResponseData(response.request);
            requestLogView.addEntry(response, request, onLogEntryClicked);
            requestLogStore.store(moment(response.request.time).unix(), { 'rsp': response, 'rqst': request });
            responseView.setResponseData(response.response, request);
            loaderView.hide();
        };

        /**
         * @param jqXHR
         * @param status
         * @param msg
         */
        var onRequestFail = function(jqXHR, status, msg) {
            errorView.showMessage(msg + ': ' + app.escapeHTML(jqXHR.responseText));
            loaderView.hide();
        };

        /**
         * @param {browsapi.Request} request
         */
        app.makeRequest = function(request) {
            minimizeContainer();
            requestView.hide();
            requestLogView.hide();
            responseView.hide();
            loaderView.show();
            
            $.ajax({
                url: '/proxy', 
                data: request.getParams(), 
                type: 'POST'
            }).done(function(data) { onRequestDone(data, request); })
              .fail(onRequestFail);
        };
        
        $h1.html('Browsa Pi <small>v' + browsapi.Config.version + '</small>');
        if (browsapi.Config.configFilePath.length > 0) {
            $('title').text(browsapi.Config.configFilePath + ' - Browsa Pi v' + browsapi.Config.version);
        }
        
        // Restore request log
        requestLogStore.retrieveAll(function(entries) {
            var sortable = [];
            
            for (var key in entries) {
                if (!entries[key]) {
                    continue;
                }
                
                var entry = entries[key];
                if (!entry.rsp || !entry.rqst) {
                    continue;
                }
                
                sortable.push({
                    timestamp: key,
                    rsp: entry.rsp,
                    rqst: new browsapi.Request(
                        entry.rqst.method,
                        new browsapi.Endpoint(
                            entry.rqst.endpoint.host,
                            entry.rqst.endpoint.auth,
                            entry.rqst.endpoint.headers,
                            entry.rqst.endpoint.username,
                            entry.rqst.endpoint.password
                        ),
                        entry.rqst.path
                    )
                });
            }
            
            sortable.sort(function(a, b) {
                return a.timestamp - b.timestamp;
            });
            
            $.each(sortable, function(_, entry) {
                requestLogView.addEntry(
                    entry.rsp,
                    entry.rqst,
                    onLogEntryClicked
                );
            });
        });
    },


    /**
     * @param {String} type         Either 'client', 'server', or 'memory'
     * @param {String} namespace    The namespace to use for keys stored with the storage.
     * @returns {Object}            Object with functions 'store()', 'retrieve()', and 'retrieveAll()'.
     * @constructor
     */
    Storage: function(type, namespace) {
        var formatKey = function(key) {
            return namespace + '.' + key;
        };

        var unformatKey = function(key) {
            if (key.indexOf(namespace + '.') == 0) {
                return key.substr(namespace.length + 1);
            }
            return false;
        };
        
        var serialize = function(value) {
            return JSON.stringify(value);
        };
        
        var unserialize = function(value) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return undefined;
            }
        };
        
        switch (type)
        {
            // Browser's local storage
            case 'client':
                return {
                    store: function(key, value, onDone) {
                        localStorage.setItem(formatKey(key), serialize(value));
                        if ($.isFunction(onDone)) {
                            onDone();
                        }
                    },
                    retrieve: function(key, onFound) {
                        onFound(unserialize(localStorage.getItem(formatKey(key))));
                    },
                    retrieveAll: function(onFound) {
                        var values = {};
                        for (var key in localStorage) {
                            var realKey = unformatKey(key);
                            if (realKey.length) {
                                values[realKey] = unserialize(localStorage.getItem(key));
                            }
                        }
                        onFound(values);
                    },
                    clear: function(onDone) {
                        localStorage.clear();
                        if ($.isFunction(onDone)) {
                            onDone();
                        }
                    }
                };
            
            // Server-side storage (eg. flat file)
            case 'server':
                var errorView = new browsapi.ErrorView();
                
                return {
                    store: function(key, value, onDone) {
                        $.ajax({
                            url: '/storage?ns=' + namespace,
                            data: { 'key': key, 'value': serialize(value) },
                            type: 'POST'
                        }).done(onDone)
                          .fail(function() { errorView.showMessage('Failed to store data in server storage.'); });
                    },
                    retrieve: function(key, onFound) {
                        $.ajax({
                            url: '/storage',
                            data: { 'ns': namespace, 'key': key },
                            type: 'GET'
                        }).done(function(value) { onFound(unserialize(value)); })
                          .fail(function() { errorView.showMessage('Failed to retrieve data from server storage.'); });
                    },
                    retrieveAll: function(onFound) {
                        $.ajax({
                            url: '/storage',
                            data: { 'ns': namespace },
                            type: 'GET'
                        }).done(function(values) {
                                for (var key in values) {
                                    values[key] = unserialize(values[key]);
                                }
                                onFound(values);
                            })
                          .fail(function() { errorView.showMessage('Failed to retrieve data from server storage.'); });
                    },
                    clear: function(onDone) {
                        $.ajax({
                            url: '/storage?ns=' + namespace,
                            data: {},
                            type: 'DELETE'
                        }).done(onDone)
                          .fail(function() { errorView.showMessage('Failed to clear server storage.'); });
                    }
                };
            
            // Memory storage.
            case 'memory':
            default:
                return {
                    storage: {},
                    store: function(key, value, onDone) {
                        this.storage[key] = value;
                        if ($.isFunction(onDone)) {
                            onDone();
                        }
                    },
                    retrieve: function(key, onFound) {
                        onFound(this.storage[key]);
                    },
                    retrieveAll: function(onFound) {
                        onFound(this.storage);
                    },
                    clear: function(onDone) {
                        this.storage = {};
                        if ($.isFunction(onDone)) {
                            onDone();
                        }
                    }
                };
        }
    }
};