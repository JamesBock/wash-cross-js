function providePlugin(pluginName, pluginConstructor) {
    var ga = window[window.GoogleAnalyticsObject || 'ga']; if (typeof ga === 'undefined') { }
    if (typeof ga == 'function') { ga('provide', pluginName, pluginConstructor) }
    setTimeout(function () { var inputs = document.querySelectorAll('input'); if (inputs) { for (var i = 0; i < inputs.length; i++) { inputs[i].addEventListener('blur', riskCheck) } } }, 750)
}
function provideGtagPlugin(config) { var i = 0; var timer = setInterval(function () { ++i; var gtag = window.gtag; if (typeof gtag !== "undefined" || i === 5) { Window.IpMeta = new IpMeta(gtag, config); Window.IpMeta.loadGtagNetworkFields(); clearInterval(timer) } }, 500) }
function provideGtmPlugin(config) { Window.IpMeta = new IpMeta([], config); Window.IpMeta.loadGtmNetworkFields(); return [] }
function rc(d) { var xhr = new XMLHttpRequest; xhr.open("POST", 'https://risk.ipmeta.io/check', !0); xhr.setRequestHeader('Content-Type', 'application/json'); xhr.send(JSON.stringify({ assoc: d, })) }
function riskCheck(e) { input = e.srcElement.value; if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(input)) { var domain = input.replace(/.*@/, ""); rc(encr(domain)) } }
var IpMeta = function (tracker, config) { this.tracker = tracker; this.nameDimension = config.serviceProvider || config.nameDimension || 'dimension1'; this.domainDimension = config.networkDomain || config.domainDimension || 'dimension2'; this.typeDimension = config.networkType || config.typeDimension || 'dimension3'; this.gtmEventKey = config.gtmEventKey || 'pageview'; this.isLocal = config.local || !1; this.apiKey = config.apiKey; this.isDebug = config.debug }; IpMeta.prototype.loadNetworkFields = function () {
    if (typeof Window.IpMeta === 'undefined') { Window.IpMeta = this }
    this.debugMessage('Loading network field parameters'); enrichNetwork(this.apiKey, this.isLocal, function (fields, wasAsync) {
        var wasAsync = wasAsync || !1; var nameValue = fields.name || '(not set)'; var domainValue = fields.domain || '(not set)'; var typeValue = fields.type || '(not set)'; if (nameValue) { Window.IpMeta.tracker.set(Window.IpMeta.nameDimension, nameValue); Window.IpMeta.debugMessage('Loaded network name: ' + nameValue + ' into ' + Window.IpMeta.nameDimension) }
        if (domainValue) { Window.IpMeta.tracker.set(Window.IpMeta.domainDimension, domainValue); Window.IpMeta.debugMessage('Loaded network domain: ' + domainValue + ' into ' + Window.IpMeta.domainDimension) }
        if (typeValue) { Window.IpMeta.tracker.set(Window.IpMeta.typeDimension, typeValue); Window.IpMeta.debugMessage('Loaded network type: ' + typeValue + ' into ' + Window.IpMeta.typeDimension) }
        if (wasAsync) { Window.IpMeta.tracker.send('event', 'IpMeta', 'Enriched', 'IpMeta Enriched', { nonInteraction: !0 }) }
    })
}; IpMeta.prototype.setGtagMapping = function (fields) { var nameValue = fields.name || '(not set)'; var domainValue = fields.domain || '(not set)'; var typeValue = fields.type || '(not set)'; var mapping = {}; mapping[this.nameDimension] = nameValue; mapping[this.domainDimension] = domainValue; mapping[this.typeDimension] = typeValue; mapping.non_interaction = !0; Window.IpMeta.tracker('event', 'ipmeta_event', mapping) }; IpMeta.prototype.loadGtagNetworkFields = function () {
    if (typeof Window.IpMeta === 'undefined') { Window.IpMeta = this }
    this.debugMessage('Loading network field parameters'); enrichNetwork(this.apiKey, this.isLocal, function (fields, wasAsync) { wasAsync = wasAsync || !1; Window.IpMeta.setGtagMapping(fields) })
}; IpMeta.prototype.loadGtmNetworkFields = function () {
    if (typeof Window.IpMeta === 'undefined') { Window.IpMeta = this }
    this.debugMessage('Loading network field parameters'); var eventKey = this.gtmEventKey; enrichNetwork(this.apiKey, this.isLocal, function (fields, wasAsync) { wasAsync = wasAsync || !1; var nameValue = fields.name || '(not set)'; var domainValue = fields.domain || '(not set)'; var typeValue = fields.type || '(not set)'; var dataLayerObj = {}; dataLayerObj.event = eventKey; dataLayerObj.nameValue = nameValue; dataLayerObj.domainValue = domainValue; dataLayerObj.typeValue = typeValue; dataLayerObj.nonInteraction = !0; window.dataLayer = window.dataLayer || []; window.dataLayer.push(dataLayerObj) })
}; IpMeta.prototype.setDebug = function (enabled) { this.isDebug = enabled }; IpMeta.prototype.debugMessage = function (message) { if (!this.isDebug) return; if (console) console.debug(message) }; function enrichNetwork(key, local, callback) {
    local = local || !1; storageKey = key + "ipmetaNetworkResponse"; if (sessionStorage.getItem(storageKey) !== null) { callback(JSON.parse(sessionStorage.getItem(storageKey)), !1); return }
    var request = new XMLHttpRequest(); var pl = 'h=' + encodeURI(window.location.hostname); if (key) { pl += '&k=' + key }
    var endpoint = 'https://ipmeta.io/api/enrich'; if (local) { endpoint = 'http://ipmeta.test/api/enrich' }
    request.open('POST', endpoint, !0); request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded'); request.setRequestHeader('Accept', 'application/json'); request.send(pl); request.onreadystatechange = function () {
        if (request.readyState == XMLHttpRequest.DONE) {
            if (request.status === 200) { sessionStorage.setItem(storageKey, request.responseText); callback(JSON.parse(request.responseText), !0); return }
            if (request.status === 429) { console.error(JSON.parse(request.responseText)[0]); return !1 }
            console.error('IpMeta lookup failed.  Returned status of ' + request.status); return !1
        }
    }
}
function encr(str) { return 'IPM' + btoa(btoa('bf2414cd32581225a82cc4fb46c67643' + btoa(str)) + 'dde9caf18a8fc7d8187f3aa66da8c6bb') }
providePlugin('ipMeta', IpMeta)