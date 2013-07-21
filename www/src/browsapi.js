var browsapi = {
    Config: {
        version        : '',
        configFilePath : '',
        requestLogType : '',
        hosts          : {},
        paths          : {},
        userOptions    : {},
        timeFormat     : 'HH:mm:ss',
        dateFormat     : 'YYYY-DD-MM',

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
         * @param {browsapi.Config.UserOption} option
         */
        setUserOption: function(option) {
            this.userOptions[option.key] = option;
            return this;
        },

        /**
         * @param {String} key
         * @returns {String}
         */
        getUserOptionValue: function(key) {
            if (!this.userOptions[key]) {
                return '';
            }
            
            var value =  this.userOptions[key].value;
            return value ? value : '';
        },

        /**
         * @param {String} value
         * @returns {String}
         */
        replaceUserOptions: function(value) {
            for (var key in this.userOptions) {
                var regex = new RegExp('{{' + key + '}}', 'g');
                value = value.replace(regex, this.getUserOptionValue(key));
            }
            return value;
        },

        /**
         * @returns {boolean}
         */
        hasUserOptions: function() {
            return Object.keys(this.userOptions).length > 0;
        },

        /**
         * @param {String} alias
         * @param {String} host
         */
        setHost: function(alias, host) {
            this.hosts[alias] = host;
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
     * @param {String} key
     * @param {String} description
     * @constructor
     */
    UserOption: function(key, description) {
        var opt         = this;
        opt.key         = key;
        opt.description = description;
        opt.value       = null;
    },
    

    /**
     * @param {String} url
     * @param {String} auth      Either 'none' or 'basic'
     * @param {Object} headers   Key/value map
     * @param {String} username  Username to use with basic auth
     * @param {String} password  Password to use with basic auth
     * @constructor
     */
    Host: function(url, auth, headers, username, password) {
        var host      = this;
        host.url      = url;
        host.auth     = auth;
        host.headers  = headers;
        host.username = username;
        host.password = password;
    },
    
    
    /**
     * @param {String} method
     * @param {browsapi.Host} host
     * @param {String} path
     * @constructor
     */
    Request: function(method, host, path) {
        var rqst    = this;
        rqst.method = method;
        rqst.path   = path;
        rqst.host   = host;

        /**
         * @returns {String}
         */
        rqst.getFullURL = function() {
            return rqst.host.url + rqst.path;
        };

        /**
         * @returns {Object}
         */
        rqst.getParams = function() {
            return {
                url      : rqst.host.url + rqst.path,
                method   : rqst.method,
                auth     : rqst.host.auth,
                headers  : rqst.host.headers,
                username : rqst.host.username,
                password : rqst.host.password
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


    /**
     * @param {Object} options  Keys: string, Values: browsapi.Config.UserOption objects
     * @param {Function} onSave
     * @constructor
     */
    OptionsDialogView: function(options, onSave) {
        var view = this;

        var $dlg  = $('#conf_options_dlg');
        var $opts = $dlg.find('.options');
        var $save = $dlg.find('button');
        
        for (var key in options) {
            var option = options[key];
            var $opt = $('<p><input data-key="' + option.key + '" type="text" placeholder="' + option.description + ' ..."></p>');
            $opts.append($opt);
        };

        var dlg = new browsapi.DialogView($dlg);
        
        var wrappedOnSave = function() {
            if ($.isFunction(onSave)) {
                for (var key in options) {
                    options[key].value = $opts.find('input[data-key="' + key + '"]').val();
                };
                onSave(options);
            }
            view.hide();
        };
        
        $save.on('click', wrappedOnSave);
        $dlg.find('input').on('keyup', function(e) {
            if (e.keyCode == 13) {
                wrappedOnSave();
                e.stopPropagation();
            }
        });
        
        view.show = function() {
            dlg.show();
        };

        view.hide = function() {
            dlg.hide();
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

        if (browsapi.Config.hasUserOptions()) {
            var optionsView = new browsapi.OptionsConfiguratorView();
            $(function() {
                optionsView.showDialog();
            });
        }

        /**
         * @param {String} path
         */
        view.setPath = function(path) {
            pathView.setValue(path);
        };
        
        /**
         * @param {browsapi.Config.Host} host
         */
        view.showHost = function(host) {
            headersView.setHeaders(host.headers);
            hostView.setValue(host.url);
            
            $confAuth.val(host.auth).trigger('change');
            if (host.auth == 'basic') {
                $confBasicAuthUser.val(browsapi.Config.replaceUserOptions(host.username));
                $confBasicAuthPass.val(browsapi.Config.replaceUserOptions(host.password));
            }
        };

        /**
         * @returns {browsapi.Request}
         */
        view.getPreparedRequest = function() {
            return new browsapi.Request(
                $confMethod.val(),
                new browsapi.Host(
                    hostView.getValue(),
                    $confAuth.val(),
                    headersView.getHeaders(),
                    $confBasicAuthUser.val(),
                    $confBasicAuthPass.val()
                ),
                pathView.getNormalizedValue()
            );
        };

        var onAuthTypeChanged = function() {
            switch ($confAuth.val())
            {
                case 'basic':
                    $confBasicAuth.show();
                    break;
                
                default:
                    $confBasicAuth.hide();
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
            
            app.makeRequest(view.getPreparedRequest());
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
     * The user options configurator.
     * 
     * @constructor
     */
    OptionsConfiguratorView: function() {
        var view = this;
        var $confOptions = $('#conf_options');
        
        var optionsDlg = new browsapi.OptionsDialogView(
            browsapi.Config.userOptions,
            function(options) {
                browsapi.Config.userOptions = options;
            }
        );
        
        $confOptions.on('click', function() {
            optionsDlg.show();
        });

        $confOptions.show();
        
        view.showDialog = function() {
            optionsDlg.show();
        };
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

        var headerDlg = new browsapi.HeaderDialogView();
        
        $confHeaderValues.on('click', 'a', function(e) {
            e.preventDefault();
            var $a = $(this);
            headerDlg.show($a.data('key'), $a.data('value'), addOrUpdateHeader);
            headerDlg.focusValue();
        });
        
        $confAddHeader.on('click', function(e) {
            e.preventDefault();
            headerDlg.show('', '', addOrUpdateHeader);
            headerDlg.focusKey();
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

        var $host  = $('#conf_host');
        var $hosts = $('#conf_hosts');

        /**
         * @param {String} host
         */
        view.setValue = function(host) {
            $host.val(browsapi.Config.replaceUserOptions(host));
        };

        /**
         * @returns {String}
         */
        view.getValue = function() {
            return $host.val();
        };

        var hosts = browsapi.Config.hosts;
        
        if (Object.keys(hosts).length > 0) {
            $host.addClass('has-selector');
            $hosts.append('<ul></ul>');
        } else {
            $host.find('+ .selector').hide();
        }

        /**
         * @param {browsapi.Config.Host} host
         * @returns {Function}
         */
        var createShowHostHandler = function(host) {
            return function() {
                configuratorView.showHost(host);
                $(this).parents('.selection').prev('.selector').trigger('click'); // Hide selector
            };
        };

        for (var alias in hosts) {
            var $li = $('<li></li>');
            $li.text(alias);
            $li.on('click', createShowHostHandler(hosts[alias]));
            $hosts.find('ul').append($li);
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
            $confPath.val(browsapi.Config.replaceUserOptions(path));
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
         * @param {Function} onAPIPathClicked   Triggered when an URL in the returned content references
         *                                      the same host as the inital request.
         */
        view.setResponseData = function(data, request, onAPIPathClicked) {
            $rspStatusCode.text(data.status_code);
            $rspDuration.text(data.duration);
            $rspTime.text(moment(data.time).format(browsapi.Config.dateTimeFormat));
            $rspBodyRaw.html(app.escapeHTML(data.body).replace(/\r/g, '').replace(/\n/g, '<br>'));
            app.addHeadersToTable($rspHeaders.find('tbody'), data.headers);
            
            try {
                var bodyData = JSON.parse(data.body);
                $rspBodyJsonBrowser.jsonbrowser(
                    bodyData,
                    {
                        urlFormatter: function(url) {
                            var markup = $.jsonbrowser.urlFormatter(url);
                            if (url.indexOf(request.host.url) == 0) {
                                markup = $(markup);
                                markup.on('click', function(e) {
                                    e.preventDefault();
                                    var parser = document.createElement('a');
                                    parser.href = $(this).attr('href');
                                    onAPIPathClicked(url, parser.pathname);
                                });
                            }
                            return markup;
                        }
                    }
                );
                $rspBodyJson.show();
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
            $container.animate({ marginTop: '-128' }, 800);
        };

        /**
         * @param {String} html
         * @returns {String}
         */
        app.escapeHTML = function(html) {
            return $('<div>').text(html).html();
        };

        /**
         * This function is called when an URL to the same host is found in
         * the response of a proxied request. We'll then capture the click
         * event of this URL and start a new proxy request after setting the
         * path.
         * 
         * @param {String} url
         * @param {String} path
         */
        var onAPIPathClicked = function(url, path) {
            configuratorView.setPath(path);
            app.makeRequest(configuratorView.getPreparedRequest());
        };

        /**
         * @param {Object} response             The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         */
        var onLogEntryClicked = function(response, request) {
            requestView.setResponseData(response.request);
            responseView.setResponseData(response.response, request, onAPIPathClicked);
        };

        /**
         * @param {Object} response             The response data from the server.
         * @param {browsapi.Request} request    The request that was sent to the server.
         */
        var onRequestDone = function(response, request) {
            requestView.setResponseData(response.request);
            requestLogView.addEntry(response, request, onLogEntryClicked);
            requestLogStore.store(moment(response.request.time).unix(), { 'rsp': response, 'rqst': request });
            responseView.setResponseData(response.response, request, onAPIPathClicked);
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
                        new browsapi.Host(
                            entry.rqst.host.host,
                            entry.rqst.host.auth,
                            entry.rqst.host.headers,
                            entry.rqst.host.username,
                            entry.rqst.host.password
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