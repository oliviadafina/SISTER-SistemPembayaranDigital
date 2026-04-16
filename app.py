import time
import random
import json
import queue
import threading
import paho.mqtt.client as mqtt
from flask import Flask, render_template, request, jsonify, Response

accounts_db = {
    "0011231005": {
        "name": "Aisyah Wilda Fauziah Amanda",
        "balance": 5000000
    },
    "0011231027": {
        "name": "Galuh Juliviana Romanita",
        "balance": 3000000
    },
    "0011231037": {
        "name": "Mahardika Arka",
        "balance": 2500000
    },
    "0011231065": {
        "name": "Shadiq Al-Fatiy",
        "balance": 2500000
    }
}

app = Flask(__name__)
MQTT_BROKER  = 'localhost'
MQTT_PORT    = 1883
MQTT_TOPIC   = 'sister/payment/notification'

sse_clients = []

def on_mqtt_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f'[MQTT] Terhubung ke broker {MQTT_BROKER}:{MQTT_PORT}')
        client.subscribe(MQTT_TOPIC)
        print(f'[MQTT] Subscribe ke topic: {MQTT_TOPIC}')
    else:
        print(f'[MQTT] Gagal terhubung, kode: {reason_code}')

def on_mqtt_message(client, userdata, message):
    try:
        payload = message.payload.decode('utf-8')
        print(f'[MQTT] Pesan diterima dari broker, topic: {message.topic}')
        sse_message = f'data: {payload}\n\n'
        for client_queue in sse_clients:
            client_queue.put(sse_message)
        print(f'[MQTT] Pesan diteruskan ke {len(sse_clients)} SSE client(s)')
    except Exception as e:
        print(f'[MQTT] Error memproses pesan: {e}')

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_message = on_mqtt_message

try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    mqtt_client.loop_start()
    print('[MQTT] Client dimulai, menunggu koneksi...')
except Exception as e:
    print(f'[MQTT] Tidak dapat terhubung ke broker: {e}')
    print('[MQTT] Pastikan Mosquitto berjalan!')

def publish_notification(notif_type, title, message):
    payload = json.dumps({
        'type':    notif_type,
        'title':   title,
        'message': message
    })
    result = mqtt_client.publish(MQTT_TOPIC, payload, qos=1)
    if result.rc == mqtt.MQTT_ERR_SUCCESS:
        print(f'[MQTT] Published ke topic {MQTT_TOPIC}: {title}')
    else:
        print(f'[MQTT] Gagal publish, kode: {result.rc}')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/pay', methods=['POST'])
def pay():
    start_time = time.time()
    data      = request.get_json()
    account   = data.get('account', '').strip()
    amount    = float(data.get('amount', 0))
    note      = data.get('note', '').strip()

    log_steps = []
    log_steps.append({
        'model':   'request-response',
        'message': '[→ REQUEST] Client (Browser) mengirim data pembayaran ke Server'
    })

    if not account or amount <= 0:
        publish_notification('error', 'Pembayaran Gagal', 'Data pembayaran tidak lengkap.')
        return jsonify({
            'success': False,
            'message': 'Mohon isi semua data pembayaran.',
            'logs':    log_steps,
            'latency': 0
        }), 400

    if account not in accounts_db:
        log_steps.extend([
            {'model': 'request-response', 'message': f'[✗ VALIDASI] Server tidak menemukan rekening {account} di database'},
            {'model': 'publish-subscribe', 'message': f'[MQTT PUBLISH] Server → Message Broker (MQTT)'}
        ])
        
        publish_notification(
            'error',
            'Pembayaran Gagal',
            f'Rekening {account} tidak ditemukan.'
        )

        return jsonify({
            'success': False,
            'message': 'Cek kembali nomor rekening yang anda masukkan!',
            'logs': log_steps,
            'latency': round((time.time() - start_time) * 1000)
        })



    sender = accounts_db[account]
    recipient_name = sender["name"]

    log_steps.append({
        'model':   'request-response',
        'message': f'[✓ VALIDASI] Server menemukan rekening {account} atas nama {recipient_name}'
    })

    if sender["balance"] < amount:
        log_steps.append({
            'model': 'request-response',
            'message': f'[✗ VALIDASI] Saldo tidak mencukupi (Rp {sender["balance"]:,})'
        })
        publish_notification(
            'error',
            'Pembayaran Gagal',
            'Saldo tidak mencukupi.'
        )

        return jsonify({
            'success': False,
            'message': 'Saldo tidak cukup.',
            'logs': log_steps,
            'latency': round((time.time() - start_time) * 1000)
        })

    time.sleep(random.uniform(0.5, 1.5))
    success = True
    latency = round((time.time() - start_time) * 1000)

    if success:
        sender["balance"] -= amount
        transaction_id = f"SISTER{int(time.time() * 1000) % 10000000:07d}"
        log_steps.extend([
            {'model': 'request-response', 'message': f'[✓ PROSES] Pembayaran berhasil. ID: {transaction_id}'},
            {'model': 'publish-subscribe', 'message': f'[MQTT PUBLISH] Server → Message Broker (MQTT)'},
            {'model': 'publish-subscribe', 'message': f'[MQTT BROKER] Message Broker (MQTT) mendistribusikan pesan ke semua subscriber'},
            {'model': 'publish-subscribe', 'message': f'[MQTT SUBSCRIBE] Server menerima pesan dari Message Broker (MQTT) → push ke Client (Browser) via SSE'}
        ])
        publish_notification('success', 'Pembayaran Berhasil!', f'Transfer Rp {amount:,.0f} ke {recipient_name} berhasil. ID: {transaction_id}')
        return jsonify({
            'success':        True,
            'message':        f'Transfer Rp {amount:,.0f} ke {recipient_name} berhasil!',
            'transaction_id': transaction_id,
            'logs':           log_steps,
            'latency':        latency
        })

@app.route('/notifications')
def notifications():
    def event_stream():
        my_queue = queue.Queue()
        sse_clients.append(my_queue)
        try:
            yield 'data: {"type": "connected", "message": "Browser subscribe via SSE, MQTT broker aktif"}\n\n'
            while True:
                try:
                    message = my_queue.get(timeout=25)
                    yield message
                except queue.Empty:
                    yield 'data: {"type": "heartbeat"}\n\n'
        finally:
            if my_queue in sse_clients:
                sse_clients.remove(my_queue)

    return Response(event_stream(), mimetype='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
