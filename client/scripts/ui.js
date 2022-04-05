const $ = query => document.getElementById(query);
const $$ = query => document.body.querySelector(query);
const isURL = text => /^((https?:\/\/|www)[^\s]+)/g.test(text.toLowerCase());
window.isDownloadSupported = (typeof document.createElement('a').download !== 'undefined');
window.isProductionEnvironment = !window.location.host.startsWith('localhost');
window.iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
window.connectionPendingModal = false;

class PeersUI {
    constructor() {
        Events.on('peer-joined', e => this._onPeerJoined(e.detail));
        Events.on('peer-left', e => this._onPeerLeft(e.detail));
        Events.on('peers', e => this._onPeers(e.detail));
        Events.on('file-progress', e => this._onFileProgress(e.detail));
        Events.on('channel-opening', e => this._onChannelOpening(e.detail));
        Events.on('channel-opened', e => this._onChannelOpened(e.detail));
        Events.on('channel-closed', e => this._onChannelClosed(e.detail));

        this.timer = null;
        this.connectionPendingModal = false;
    }

    _onPeerJoined(peer) {
        if (document.getElementById(peer.id)) return;
        const peerUI = new PeerUI(peer);
        $$('x-peers').appendChild(peerUI.$el);
    }

    _onPeers(peers) {
        this._clearPeers();
        peers.forEach(peer => this._onPeerJoined(peer));
    }

    _onPeerLeft(peerId) {
        const $peer = $(peerId);
        if (!$peer) return;
        $peer.remove();
    }

    _onFileProgress(progress) {
        const peerId = progress.sender || progress.recipient;
        const $peer = $(peerId);
        if (!$peer) return;
        $peer.ui.setProgress(progress.progress);
    }

    _onChannelOpening(peerId) {
        const $peer = $(peerId)
        $peer.querySelector('.status').textContent = i18nUI[lang].CHANNEL_STATUS_OPENING;
        if (this.connectionPendingModal) return;
        this.connectionPendingModal = true;
        this.timer = setTimeout(_ => {
            Events.fire('show-modal', i18nUI[lang].TIP_CONNECTION_PENDING);
        }, 5000);
    }

    _onChannelOpened(peerId) {
        const $peer = $(peerId)
        $peer.querySelector('.status').textContent = i18nUI[lang].CHANNEL_STATUS_OPENED;
        clearTimeout(this.timer);
        this.timer = null;
    }

    _onChannelClosed(peerId) {
        const $peer = $(peerId);
        $peer.querySelector('.status').textContent = i18nUI[lang].CHANNEL_STATUS_CLOSED;
        console.log(`${peerId} channel is closed`);
    }

    _clearPeers() {
        const $peers = $$('x-peers').innerHTML = '';
    }
}

class PeerUI {
    html() {
        return `
            <label class="column center">
                <input type="file" multiple>
                <x-icon shadow="1">
                    <svg class="icon"><use xlink:href="#"/></svg>
                </x-icon>
                <div class="progress">
                  <div class="circle"></div>
                  <div class="circle right"></div>
                </div>
                <div class="name font-subheading"></div>
                <div class="status font-body2"></div>
            </label>`
    }

    constructor(peer) {
        this._peer = peer;
        this._initDom();
        this._bindListeners(this.$el);
    }

    _initDom() {
        const el = document.createElement('x-peer');
        el.id = this._peer.id;
        el.innerHTML = this.html();
        el.ui = this;
        el.querySelector('svg use').setAttribute('xlink:href', this._icon());
        el.querySelector('.name').textContent = this._name();
        el.querySelector('.status').textContent = i18nUI[lang].CHANNEL_STATUS_CLOSED;;
        this.$el = el;
        this.$progress = el.querySelector('.progress');
    }

    _bindListeners(el) {
        el.querySelector('input').addEventListener('change', e => this._onFilesSelected(e));
        el.addEventListener('drop', e => this._onDrop(e));
        el.addEventListener('dragend', e => this._onDragEnd(e));
        el.addEventListener('dragleave', e => this._onDragEnd(e));
        el.addEventListener('dragover', e => this._onDragOver(e));
        el.addEventListener('contextmenu', e => this._onRightClick(e));
        el.addEventListener('touchstart', e => this._onTouchStart(e));
        el.addEventListener('touchend', e => this._onTouchEnd(e));
        // prevent browser's default file drop behavior
        Events.on('dragover', e => e.preventDefault());
        Events.on('drop', e => e.preventDefault());
    }

    _name() {
        if (this._peer.name.model) {
            return this._peer.name.os + ' ' + this._peer.name.model;
        }
        this._peer.name.os = this._peer.name.os.replace('Mac OS', 'Mac');
        return this._peer.name.os + ' ' + this._peer.name.browser;
    }

    _icon() {
        const device = this._peer.name.device || this._peer.name;
        if (device.type === 'mobile') {
            return '#phone-iphone';
        }
        if (device.type === 'tablet') {
            return '#tablet-mac';
        }
        return '#desktop-mac';
    }

    _onFilesSelected(e) {
        const $input = e.target;
        const files = $input.files;
        Events.fire('files-selected', {
            files: files,
            to: this._peer.id
        });
        $input.value = null; // reset input
        this.setProgress(0.01);
    }

    setProgress(progress) {
        if (progress > 0) {
            this.$el.setAttribute('transfer', '1');
        }
        if (progress > 0.5) {
            this.$progress.classList.add('over50');
        } else {
            this.$progress.classList.remove('over50');
        }
        const degrees = `rotate(${360 * progress}deg)`;
        this.$progress.style.setProperty('--progress', degrees);
        if (progress >= 1) {
            this.setProgress(0);
            this.$el.removeAttribute('transfer');
        }
    }

    _onDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        Events.fire('files-selected', {
            files: files,
            to: this._peer.id
        });
        this._onDragEnd();
    }

    _onDragOver() {
        this.$el.setAttribute('drop', 1);
    }

    _onDragEnd() {
        this.$el.removeAttribute('drop');
    }

    _onRightClick(e) {
        e.preventDefault();
        Events.fire('text-recipient', this._peer.id);
    }

    _onTouchStart(e) {
        this._touchStart = Date.now();
        this._touchTimer = setTimeout(_ => this._onTouchEnd(), 610);
    }

    _onTouchEnd(e) {
        if (Date.now() - this._touchStart < 500) {
            clearTimeout(this._touchTimer);
        } else { // this was a long tap
            if (e) e.preventDefault();
            Events.fire('text-recipient', this._peer.id);
        }
    }
}

class Dialog {
    constructor(id) {
        this.$el = $(id);
        this.$el.querySelectorAll('[close]').forEach(el => el.addEventListener('click', e => this.hide()))
        this.$autoFocus = this.$el.querySelector('[autofocus]');
    }

    show() {
        this.$el.setAttribute('show', 1);
        if (this.$autoFocus) this.$autoFocus.focus();
    }

    hide() {
        this.$el.removeAttribute('show');
        document.activeElement.blur();
        window.blur();
    }
}

class ReceiveDialog extends Dialog {
    constructor() {
        super('receiveDialog');
        Events.on('file-received', e => {
            this._nextFile(e.detail);
            window.dropsound.play();
        });
        this._filesQueue = [];
    }

    _nextFile(nextFile) {
        if (nextFile) this._filesQueue.push(nextFile);
        if (this._busy) return;
        this._busy = true;
        const file = this._filesQueue.shift();
        this._displayFile(file);
    }

    _dequeueFile() {
        if (!this._filesQueue.length) { // nothing to do
            this._busy = false;
            return;
        }
        // dequeue next file
        setTimeout(_ => {
            this._busy = false;
            this._nextFile();
        }, 300);
    }

    _displayFile(file) {
        const $a = this.$el.querySelector('#download');
        const url = URL.createObjectURL(file.blob);
        $a.href = url;
        $a.download = file.name;

        this.$el.querySelector('#fileName').textContent = file.name;
        this.$el.querySelector('#fileSize').textContent = this._formatFileSize(file.size);
        this.show();

        if (window.isDownloadSupported) return;
        // fallback for iOS
        $a.target = '_blank';
        const reader = new FileReader();
        reader.onload = e => $a.href = reader.result;
        reader.readAsDataURL(file.blob);
    }

    _formatFileSize(bytes) {
        if (bytes >= 1e9) {
            return (Math.round(bytes / 1e8) / 10) + ' GB';
        } else if (bytes >= 1e6) {
            return (Math.round(bytes / 1e5) / 10) + ' MB';
        } else if (bytes > 1000) {
            return Math.round(bytes / 1000) + ' KB';
        } else {
            return bytes + ' Bytes';
        }
    }

    hide() {
        super.hide();
        this._dequeueFile();
    }
}

class SendTextDialog extends Dialog {
    constructor() {
        super('sendTextDialog');
        Events.on('text-recipient', e => this._onRecipient(e.detail))
        this.$text = this.$el.querySelector('#textInput');
        const button = this.$el.querySelector('form');
        button.addEventListener('submit', e => this._send(e));
    }

    _onRecipient(recipient) {
        this._recipient = recipient;
        this._handleShareTargetText();
        this.show();
        this.$text.setSelectionRange(0, this.$text.value.length)
    }

    _handleShareTargetText() {
        if (!window.shareTargetText) return;
        this.$text.value = window.shareTargetText;
        window.shareTargetText = '';
    }

    _send(e) {
        e.preventDefault();
        Events.fire('send-text', {
            to: this._recipient,
            text: this.$text.value
        });
    }
}

class ReceiveTextDialog extends Dialog {
    constructor() {
        super('receiveTextDialog');
        Events.on('text-received', e => this._onText(e.detail))
        this.$text = this.$el.querySelector('#text');
        const $copy = this.$el.querySelector('#copy');
        copy.addEventListener('click', _ => this._onCopy());
    }

    _onText(e) {
        this.$text.innerHTML = '';
        const text = e.text;
        if (isURL(text)) {
            const $a = document.createElement('a');
            $a.href = text;
            $a.target = '_blank';
            $a.textContent = text;
            this.$text.appendChild($a);
        } else {
            this.$text.textContent = text;
        }
        this.show();
        window.dropsound.play();
    }

    _onCopy() {
        if (!document.copy(this.$text.textContent)) return;
        Events.fire('notify-user', i18nUI[lang].COPY_TO_CLIPBOARD);
    }
}

class Toast extends Dialog {
    constructor() {
        super('toast');
        Events.on('notify-user', e => this._onNotfiy(e.detail));
    }

    _onNotfiy(message) {
        this.$el.textContent = message;
        this.show();
        setTimeout(_ => this.hide(), 3000);
    }
}

class Modal extends Dialog {
    constructor() {
        super('modal');
        this.timer = null;
        Events.on('show-modal', e => this._onNotfiy(e.detail));
    }

    _onNotfiy(message) {
        this._clearTimer();
        $$('#modal > .modal-content').textContent = message;

        // Add event listener after dom changes
        this.$el.querySelectorAll('[close]').forEach(el => el.addEventListener('click', e => this.hide()));

        this.show();
        this.timer = setTimeout(_ => this.hide(), 15000);
    }

    _clearTimer() {
        clearTimeout(this.timer);
        this.timer = null;
    }
}

class Notifications {
    constructor() {
        // Removed notification function
    }
}

class NetworkStatusUI {
    constructor() {
        window.addEventListener('offline', e => this._showOfflineMessage(), false);
        window.addEventListener('online', e => this._showOnlineMessage(), false);
        if (!navigator.onLine) this._showOfflineMessage();
    }

    _showOfflineMessage() {
        Events.fire('notify-user', i18nUI[lang].USER_OFFLINE);
    }

    _showOnlineMessage() {
        Events.fire('notify-user', i18nUI[lang].USER_ONLINE);
    }
}

class WebShareTargetUI {
    constructor() {
        const parsedUrl = new URL(window.location);
        const title = parsedUrl.searchParams.get('title');
        const text = parsedUrl.searchParams.get('text');
        const url = parsedUrl.searchParams.get('url');

        let shareTargetText = title ? title : '';
        shareTargetText += text ? shareTargetText ? ' ' + text : text : '';
        shareTargetText += url ? shareTargetText ? ' ' + url : url : '';
        if (!shareTargetText) return;
        window.shareTargetText = shareTargetText;
        history.pushState({}, 'URL Rewrite', '/');
        console.log('Shared Target Text:', '"' + shareTargetText + '"');
    }
}

// i18n hack for html and js
// https://github.com/ruyadorno/dom-i18n/blob/master/dist/dom-i18n.min.js
// Return an addition function `getLanguage`
!function(a,b){"use strict";"function"==typeof define&&define.amd?define([],function(){return a.domI18n=b()}):"object"==typeof exports?module.exports=b():a.domI18n=b()}(this,function(){"use strict";return function(a){function b(a){return a||(a=window.navigator.languages?window.navigator.languages[0]:window.navigator.language||window.navigator.userLanguage),-1===q.indexOf(a)&&(r&&console.warn(a+" is not available on the list of languages provided"),a=a.indexOf("-")?a.split("-")[0]:a),-1===q.indexOf(a)&&(r&&console.error(a+" is not compatible with any language provided"),a=p),a}function c(a){v=b(a),l()}function d(){u={}}function e(a){var b=a.getAttribute("data-dom-i18n-id");return b&&u&&u[b]}function f(a,b){var c="i18n"+Date.now()+1e3*Math.random();a.setAttribute("data-dom-i18n-id",c),u[c]=b}function g(a){return u&&u[a.getAttribute("data-dom-i18n-id")]}function h(a,b){var c={},d=a.firstElementChild,e=!d&&a[b].split(o);return q.forEach(function(b,f){var g;d?(g=a.children[f],g&&g.cloneNode&&(c[b]=g.cloneNode(!0))):(g=e[f],g&&(c[b]=String(g)))}),c}function i(a){var b,c,d=a.getAttribute(t),i=null!==a.getAttribute(s),k=d?d:"textContent";!i&&e(a)?b=g(a):(b=h(a,k),i||f(a,b)),c=b[v],"string"==typeof c?a[k]=c:"object"==typeof c&&j(a,c)}function j(a,b){k(a),a.appendChild(b)}function k(a){for(;a.lastChild;)a.removeChild(a.lastChild)}function l(){for(var a="string"==typeof n||n instanceof String?m.querySelectorAll(n):n,b=0;b<a.length;++b)i(a[b])}a=a||{};var m=a.rootElement||window.document,n=a.selector||"[data-translatable]",o=a.separator||" // ",p=a.defaultLanguage||"en",q=a.languages||["en"],r=void 0!==a.enableLog?a.enableLog:!0,s="data-no-cache",t="data-translatable-attr",u={},v=b(a.currentLanguage);return l(n),{getLanguage:b,changeLanguage:c,clearCachedElements:d}}});

class I18n {
    constructor() {
        this.i18n_ = domI18n({
            selector: '[data-translatable]',
            separator: ' // ',
            languages: ['en', 'zh'],
            defaultLanguage: 'en',
        });
        this._showDom();
        this._createI18nStrings();
    }

    _showDom() {
        document.body.style.visibility = 'visible';
    }

    _createI18nStrings() {
        window.lang = this.i18n_.getLanguage();
        window.i18nNetwork = {
            en: {
                CONNECTION_LOST_RETRY: 'Connection lost. Retrying...',
                TRANSFER_COMPLETED: 'File transfer completed.',
                PPER_CONNECTION_CLOSED_RELOAD: 'Peers connection was closed. Waiting for reloading...',
            },
            zh: {
                CONNECTION_LOST_RETRY: '连接断开，正在重试…',
                TRANSFER_COMPLETED: '文件传送完毕。',
                PPER_CONNECTION_CLOSED_RELOAD: '设备连接中断，等待刷新…',
            },
        };
        window.i18nUI = {
            en: {
                COPY_TO_CLIPBOARD: 'Copied to clipboard.',
                USER_OFFLINE: 'You are offline.',
                USER_ONLINE: 'You are back online.',
                CHANNEL_STATUS_OPENING: 'Connecting...',
                CHANNEL_STATUS_OPENED: 'Ready',
                CHANNEL_STATUS_CLOSED: 'Closed',
                TIP_BROWSER_IN_APP: 'The built-in browser of some apps may block files to download. It recommends you use FydeDrop in the system browser.',
                TIP_AUTO_UPDATE: 'Update is available and it will be applied after the next launch.',
                TIP_CONNECTION_PENDING: 'Connecting... If this takes longer than usual, please check your network connection and shutdown all proxy, network tunnel or VPN processes.',
            },
            zh: {
                COPY_TO_CLIPBOARD: '已复制到剪切板。',
                USER_OFFLINE: '设备处于离线。',
                USER_ONLINE: '设备恢复在线。',
                CHANNEL_STATUS_OPENING: '连接中…',
                CHANNEL_STATUS_OPENED: '就绪',
                CHANNEL_STATUS_CLOSED: '已断开',
                TIP_BROWSER_IN_APP: '在某些应用的内置浏览器里可能会无法下载文件，建议您在系统浏览器中使用“燧炻传送”。',
                TIP_AUTO_UPDATE: '有更新可用，在应用下次启动时会自动生效。',
                TIP_CONNECTION_PENDING: '连接中… 如等待时间过长，请确认您的设备网络连接，并关闭一切代理、隧道或 VPN 等程序。',
            },
        };
    }
}

const i18n = new I18n();

class QrCode {
    constructor() {
        const qrCode = $$('qrcode');
        qrCode.innerHTML += '<span><img src="images/drop.fydeos.com.png"></span>';
        qrCode.addEventListener('mouseover', e => this._show(e));
        qrCode.addEventListener('mouseout', e => this._hide(e));
        const qrCodeImg = $$('qrcode span');
        qrCodeImg.style.visibility = 'hidden';
        this.qrCodeImg_ = qrCodeImg;
    }

    _show() {
        this.qrCodeImg_.style.visibility = 'visible';
    }

    _hide() {
        this.qrCodeImg_.style.visibility = 'hidden';
    }
}

class FydeDrop {
    constructor() {
        const server = new ServerConnection();
        const peers = new PeersManager(server);
        const peersUI = new PeersUI();
        Events.on('load', e => {
            const qrCode = new QrCode();
            const receiveDialog = new ReceiveDialog();
            const sendTextDialog = new SendTextDialog();
            const receiveTextDialog = new ReceiveTextDialog();
            const toast = new Toast();
            const modal = new Modal();
            const notifications = new Notifications();
            const networkStatusUI = new NetworkStatusUI();
            const webShareTargetUI = new WebShareTargetUI();

            const ua = navigator.userAgent.toLowerCase();
            const isBrowserInApp = /micromessenger/.test(ua)
                || /alipayclient/.test(ua)
                || /qq/.test(ua);
            if (isBrowserInApp) {
                Events.fire('show-modal', i18nUI[lang].TIP_BROWSER_IN_APP);
            }
        });
    }
}

const fydedrop = new FydeDrop();

document.copy = text => {
    // A <span> contains the text to copy
    const span = document.createElement('span');
    span.textContent = text;
    span.style.whiteSpace = 'pre'; // Preserve consecutive spaces and newlines

    // Paint the span outside the viewport
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.top = '-9999px';

    const win = window;
    const selection = win.getSelection();
    win.document.body.appendChild(span);

    const range = win.document.createRange();
    selection.removeAllRanges();
    range.selectNode(span);
    selection.addRange(range);

    let success = false;
    try {
        success = win.document.execCommand('copy');
    } catch (err) {}

    selection.removeAllRanges();
    span.remove();

    return success;
}

// Register service worker
// https://github.com/GoogleChromeLabs/sw-precache/blob/master/demo/app/js/service-worker-registration.js
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('service-worker.js').then(function(reg) {
            reg.onupdatefound = function() {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = function() {
                    switch (installingWorker.state) {
                        case 'installed':
                            if (navigator.serviceWorker.controller) {
                                console.log('New or updated content is available.');
                                Events.fire('notify-user', i18nUI[lang].TIP_AUTO_UPDATE);
                            }
                            break;
                        default:
                            break;
                    }
                };
            };
        }).catch(function(e) {
            console.error('Error during service worker registration: ', e);
        });
    });
}

window.addEventListener('beforeinstallprompt', e => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        // don't display install banner when installed
        return e.preventDefault();
    }
});

// Background Animation
Events.on('load', () => {
    var requestAnimFrame = (function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
            function(callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();
    var c = document.createElement('canvas');
    document.body.appendChild(c);
    var style = c.style;
    style.width = '100%';
    style.position = 'absolute';
    style.zIndex = -1;
    var ctx = c.getContext('2d');
    var x0, y0, w, h, dw;

    function init() {
        w = window.innerWidth;
        h = window.innerHeight;
        c.width = w;
        c.height = h;
        var offset = h > 380 ? 100 : 65;
        x0 = w / 2;
        y0 = h - offset;
        dw = Math.max(w, h, 1000) / 13;
        drawCircles();
    }
    window.onresize = init;

    function drawCicrle(radius) {
        ctx.beginPath();
        var color = Math.round(255 * (1 - radius / Math.max(w, h)));
        ctx.strokeStyle = 'rgba(' + color + ',' + color + ',' + color + ',0.1)';
        ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 2;
    }

    var step = 0;

    function drawCircles() {
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < 8; i++) {
            drawCicrle(dw * i + step % dw);
        }
        step += 1;
    }

    var loading = true;

    function animate() {
        if (loading || step % dw < dw - 5) {
            requestAnimFrame(function() {
                drawCircles();
                animate();
            });
        }
    }
    window.animateBackground = function(l) {
        loading = l;
        animate();
    };
    init();
    animate();
    setTimeout(e => window.animateBackground(false), 3000);
});

Notifications.PERMISSION_ERROR = `
Notifications permission has been blocked
as the user has dismissed the permission prompt several times.
This can be reset in Page Info
which can be accessed by clicking the lock icon next to the URL.`;
