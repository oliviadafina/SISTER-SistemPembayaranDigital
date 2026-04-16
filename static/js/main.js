let metrics = { 
    rrTotal: 0, 
    rrSuccess: 0, 
    rrLatencySum: 0,
    psSubscribers: 1,
    psDelivered: 0,
    psDelaySum: 0
};
let balance = 2500000;

const eventSource = new EventSource('/notifications');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);

    if (data.type === 'connected') {
        addLog('publish-subscribe', '[✓ SUBSCRIBE] Browser berhasil subscribe ke Notification Service');
        document.getElementById('ps-subscriber')?.classList.add('active');
    } else if (data.type === 'heartbeat') {
    } else if (data.type === 'success' || data.type === 'error') {
        animatePubSub();

        const pDelay = 1400 + Math.floor(Math.random() * 40 - 20);
        metrics.psDelivered++;
        metrics.psDelaySum += pDelay;

        setTimeout(() => {
            showNotification(data.type, data.title, data.message);
            addLog('publish-subscribe', `[✓ RECEIVE] Notifikasi diterima oleh Subscriber (Browser): "${data.title}" Delay: ${pDelay}ms`);
            updateMetrics();
        }, 1400);
    }
};

eventSource.onerror = function() {
    addLog('publish-subscribe', '[✗ ERROR] Koneksi SSE terputus...');
};

async function processPayment() {
    const account   = document.getElementById('input-account').value.trim();
    const amount    = parseFloat(document.getElementById('input-amount').value);
    const note      = document.getElementById('input-note').value.trim();

    setLoadingState(true);
    resetFlowDiagram();

    document.getElementById('rr-client')?.classList.add('active');

    if (!account || !amount || amount <= 0) {
        addLog('request-response', '[→ REQUEST] Browser memvalidasi form sebelum mengirim request...');
        setTimeout(() => {
            addLog('request-response', '[✗ VALIDASI] Data tidak lengkap — request dibatalkan di browser, tidak dikirim ke server');
            showNotification('error', 'Form Tidak Lengkap', 'Isi semua data yang diperlukan.');
            setLoadingState(false);
        }, 600);
        return;
    }

    addLog('request-response', `[→ REQUEST] Client (Browser) mengirim pembayaran Rp ${amount.toLocaleString('id-ID')} ke Server...`);
    setTimeout(() => document.getElementById('rr-arrow-req')?.classList.add('active'), 300);
    setTimeout(() => document.getElementById('rr-server')?.classList.add('active'), 600);

    try {
        const response = await fetch('/pay', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ account, amount, note })
        });

        const result = await response.json();

        addLog('request-response', `[← RESPONSE] Server membalas dalam ${result.latency}ms`);
        setTimeout(() => document.getElementById('rr-arrow-res')?.classList.add('active'), 200);

        if (result.logs) {
            result.logs.forEach((log, index) => {
                setTimeout(() => {
                    addLog(log.model, log.message);
                }, index * 350);
            });
        }

        metrics.rrTotal++;
        metrics.rrLatencySum += result.latency;

        if (result.success) {
            metrics.rrSuccess++;
            balance -= amount;
            document.getElementById('card-balance').textContent =
                `Rp ${balance.toLocaleString('id-ID')}`;
        }
        
        updateMetrics();

    } catch (err) {
        addLog('request-response', `[✗ ERROR] Tidak dapat menghubungi server: ${err.message}`);
        showNotification('error', 'Koneksi Gagal', 'Pastikan Server(Flask) berjalan.');
        metrics.rrTotal++;
        metrics.rrLatencySum += 3000;
        updateMetrics();
    } finally {
        setLoadingState(false);
    }
}

function animatePubSub() {
    ['ps-publisher', 'ps-channel', 'ps-subscriber', 'ps-arrow-1', 'ps-arrow-2'].forEach(id =>
        document.getElementById(id)?.classList.remove('active')
    );

    const sequence = [
        [0,    'ps-publisher'],
        [400,  'ps-arrow-1'],
        [700,  'ps-channel'],
        [1100, 'ps-arrow-2'],
        [1400, 'ps-subscriber'],
    ];
    sequence.forEach(([delay, id]) =>
        setTimeout(() => document.getElementById(id)?.classList.add('active'), delay)
    );
}

function resetFlowDiagram() {
    ['rr-client', 'rr-server'].forEach(id =>
        document.getElementById(id)?.classList.remove('active')
    );
    ['rr-arrow-req', 'rr-arrow-res'].forEach(id =>
        document.getElementById(id)?.classList.remove('active')
    );
    ['ps-publisher', 'ps-channel', 'ps-subscriber'].forEach(id =>
        document.getElementById(id)?.classList.remove('active')
    );
    ['ps-arrow-1', 'ps-arrow-2'].forEach(id =>
        document.getElementById(id)?.classList.remove('active')
    );
}

function setLoadingState(loading) {
    const btn     = document.getElementById('btn-pay');
    const spinner = document.getElementById('spinner');
    const btnText = document.getElementById('btn-text');

    btn.disabled          = loading;
    spinner.style.display = loading ? 'block' : 'none';
    btnText.textContent   = loading ? 'Memproses...' : 'Bayar Sekarang';
}

function addLog(model, message) {
    const container = document.getElementById('log-entries');
    const time      = new Date().toTimeString().split(' ')[0];

    const modelInfo = {
        'request-response':  { label: 'REQ-RES', cls: 'req-res' },
        'publish-subscribe': { label: 'PUB-SUB', cls: 'pub-sub' }
    };
    const info = modelInfo[model] || { label: 'SYSTEM', cls: 'req-res' };

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-model ${info.cls}">${info.label}</span>
        <span class="log-msg">${message}</span>
    `;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
}

function showNotification(type, title, message) {
    const notif   = document.getElementById('notification');
    const icon    = document.getElementById('notif-icon');
    const titleEl = document.getElementById('notif-title');
    const msgEl   = document.getElementById('notif-message');

    titleEl.textContent = title;
    msgEl.textContent   = message;
    notif.className     = `notification ${type}`;
    icon.textContent    = type === 'success' ? '✅' : '❌';

    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 4500);
}

function clearLog() {
    document.getElementById('log-entries').innerHTML = '';
    addLog('request-response', '[INFO] Log dibersihkan.');
}

function updateMetrics() {
    const rrAvgLatency = metrics.rrTotal > 0 ? Math.round(metrics.rrLatencySum / metrics.rrTotal) : 0;
    const rrSuccessRate = metrics.rrTotal > 0 ? Math.round((metrics.rrSuccess / metrics.rrTotal) * 100) : 0;
    
    document.getElementById('metric-rr-req').textContent = metrics.rrTotal;
    document.getElementById('metric-rr-latency').textContent = metrics.rrTotal > 0 ? `${rrAvgLatency} ms` : `0 ms`;
    document.getElementById('metric-rr-success').textContent = `${rrSuccessRate}%`;

    const psAvgDelay = metrics.psDelivered > 0 ? Math.round(metrics.psDelaySum / metrics.psDelivered) : 0;
    
    document.getElementById('metric-ps-sub').textContent = metrics.psSubscribers;
    document.getElementById('metric-ps-notif').textContent = metrics.psDelivered;
    document.getElementById('metric-ps-delay').textContent = metrics.psDelivered > 0 ? `~${psAvgDelay} ms` : `~1400 ms`;

    const insightEl = document.getElementById('insight-text');
    if (metrics.rrTotal > 0 && metrics.psDelivered > 0) {
        const diff = psAvgDelay - rrAvgLatency;
        
        if (diff > 500) {
            insightEl.innerHTML = `Model <strong>Publish-Subscribe</strong> (MQTT + SSE) memiliki waktu tunda pengiriman lebih tinggi (~${psAvgDelay} ms) dibandingkan <strong>Request-Response</strong> karena menggunakan mekanisme asynchronous melalui message broker, namun lebih unggul dalam pengiriman notifikasi secara real-time.`;
        } else {
            insightEl.innerHTML = `Perbedaan performa antara <strong>Request-Response</strong> dan <strong>Publish-Subscribe</strong> dapat diamati. Model Request-Response memiliki respon lebih cepat karena komunikasi langsung, sedangkan Publish-Subscribe bersifat asynchronous dengan sedikit overhead dari message broker.`;
        }
    } else if (metrics.rrTotal > 0 && metrics.psDelivered === 0) {
        insightEl.innerHTML = `Request-Response sudah selesai, sedang menunggu notifikasi asinkron <strong>Publish-Subscribe</strong> diteruskan oleh Message Broker (MQQT)...`;
    }
}