import json
import hmac
import hashlib
import urllib.request
import urllib.error
from django.conf import settings
from rest_framework.exceptions import ValidationError


def verify_webhook_signature(payload_bytes, signature_header):
    """
    Verify Chapa HMAC-SHA256 signature against incoming raw payload bytes.
    """
    if not signature_header:
        return False

    secret = getattr(settings, 'CHAPA_WEBHOOK_SECRET', '')
    if not secret:
        return False

    computed_hash = hmac.new(
        key=secret.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_hash, signature_header)


def initialize_chapa_transaction(tx_ref, amount, user, return_url=None, title="FeeBridge Payment", description=""):
    """
    Initialize a checkout session with Chapa API.
    If running with a test/mock key or offline, returns a simulated sandbox checkout URL.
    """
    secret_key = getattr(settings, 'CHAPA_SECRET_KEY', '')
    api_url = getattr(settings, 'CHAPA_API_URL', 'https://api.chapa.co/v1')

    # If in mock/test mode without live key, return simulated sandbox response
    if not secret_key or secret_key.startswith('CHASECK_TEST-mock'):
        return {
            "status": "success",
            "message": "Hosted Link",
            "data": {
                "checkout_url": f"https://checkout.chapa.co/checkout/test-payment/{tx_ref}"
            }
        }

    payload = {
        "amount": str(amount),
        "currency": "ETB",
        "email": user.email,
        "first_name": user.first_name or "Parent",
        "last_name": user.last_name or "User",
        "phone_number": getattr(user, 'phone_number', '') or "",
        "tx_ref": tx_ref,
        "callback_url": return_url or "https://feebridge.com/api/payments/webhook/chapa/",
        "return_url": return_url or "https://feebridge.com/payment/success",
        "customization": {
            "title": title,
            "description": description or f"Payment for {tx_ref}"
        }
    }

    req = urllib.request.Request(
        f"{api_url}/transaction/initialize",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data
    except urllib.error.HTTPError as exc:
        err_content = exc.read().decode('utf-8')
        try:
            err_json = json.loads(err_content)
            err_msg = err_json.get('message', 'Chapa initialization failed.')
        except Exception:
            err_msg = err_content
        raise ValidationError(f"Chapa API error: {err_msg}")
    except urllib.error.URLError as exc:
        raise ValidationError(f"Network error contacting Chapa: {exc.reason}")
