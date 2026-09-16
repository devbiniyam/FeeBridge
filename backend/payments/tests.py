import json
import hmac
import hashlib
from datetime import date
from decimal import Decimal
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from payments.models import (
    GatewayTransaction,
    GatewayChoices,
    GatewayTransactionStatus,
    TransactionPurposeChoices
)
from notifications.models import Notification, NotificationTypeChoices


class PaymentGatewayAndWebhookTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(
            name="Gateway Academy",
            address="Gateway St",
            phone_number="+251911777000",
            unique_code="SCH-GW"
        )
        self.parent = User.objects.create_user(
            email="gateway_parent@test.com",
            password="Password123!",
            phone_number="+251911777001",
            role=RoleChoices.PARENT
        )
        self.student = Student.objects.create(
            full_name="Danny DeVito",
            gender=GenderChoices.MALE,
            grade=6,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2014, 2, 2),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee = FeeStructure.objects.create(
            school=self.school,
            grade=6,
            amount=Decimal('8000.00')
        )
        self.invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee,
            amount=Decimal('8000.00'),
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.UNPAID
        )

    def _generate_signature(self, payload_dict):
        body_bytes = json.dumps(payload_dict).encode('utf-8')
        secret = getattr(settings, 'CHAPA_WEBHOOK_SECRET', 'mock-webhook-secret')
        return hmac.new(
            key=secret.encode('utf-8'),
            msg=body_bytes,
            digestmod=hashlib.sha256
        ).hexdigest()

    def test_initialize_invoice_checkout(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.post('/api/payments/checkout/initialize/', {
            "purpose": TransactionPurposeChoices.INVOICE_PAYMENT,
            "invoice": self.invoice.id,
            "amount": "8000.00"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("tx_ref", res.data)
        self.assertIn("checkout_url", res.data)
        self.assertEqual(res.data['status'], GatewayTransactionStatus.PENDING)

        tx = GatewayTransaction.objects.get(tx_ref=res.data['tx_ref'])
        self.assertEqual(tx.user, self.parent)
        self.assertEqual(tx.amount, Decimal('8000.00'))
        self.assertEqual(tx.related_invoice, self.invoice)

    def test_initialize_wallet_deposit_checkout(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.post('/api/payments/checkout/initialize/', {
            "purpose": TransactionPurposeChoices.WALLET_DEPOSIT,
            "amount": "5000.00"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("tx_ref", res.data)
        self.assertEqual(res.data['purpose'], TransactionPurposeChoices.WALLET_DEPOSIT)

        tx = GatewayTransaction.objects.get(tx_ref=res.data['tx_ref'])
        self.assertEqual(tx.amount, Decimal('5000.00'))

    def test_chapa_webhook_invoice_payment_fulfillment(self):
        # Create pending transaction
        tx = GatewayTransaction.objects.create(
            tx_ref="FB-INV-TEST01",
            user=self.parent,
            gateway=GatewayChoices.CHAPA,
            purpose=TransactionPurposeChoices.INVOICE_PAYMENT,
            amount=Decimal('8000.00'),
            status=GatewayTransactionStatus.PENDING,
            related_invoice=self.invoice
        )

        payload = {
            "tx_ref": tx.tx_ref,
            "status": "success",
            "amount": "8000.00",
            "currency": "ETB",
            "reference": "CHAPA-REF-12345"
        }
        sig = self._generate_signature(payload)

        res = self.client.post(
            '/api/payments/webhook/chapa/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        tx.refresh_from_db()
        self.assertEqual(tx.status, GatewayTransactionStatus.SUCCESS)
        self.assertEqual(tx.gateway_reference, "CHAPA-REF-12345")

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PAID)
        self.assertEqual(self.invoice.amount_paid, Decimal('8000.00'))

        # Notification was triggered automatically
        notif = Notification.objects.filter(
            recipient=self.parent,
            notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
            related_invoice=self.invoice
        ).first()
        self.assertIsNotNone(notif)

    def test_chapa_webhook_wallet_deposit_fulfillment(self):
        tx = GatewayTransaction.objects.create(
            tx_ref="FB-WAL-TEST01",
            user=self.parent,
            gateway=GatewayChoices.CHAPA,
            purpose=TransactionPurposeChoices.WALLET_DEPOSIT,
            amount=Decimal('3500.00'),
            status=GatewayTransactionStatus.PENDING
        )

        payload = {
            "tx_ref": tx.tx_ref,
            "status": "success",
            "amount": "3500.00",
            "currency": "ETB",
            "reference": "CHAPA-DEP-67890"
        }
        sig = self._generate_signature(payload)

        res = self.client.post(
            '/api/payments/webhook/chapa/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        wallet = self.parent.wallet
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('3500.00'))

        tx.refresh_from_db()
        self.assertEqual(tx.status, GatewayTransactionStatus.SUCCESS)

    def test_chapa_webhook_idempotency(self):
        tx = GatewayTransaction.objects.create(
            tx_ref="FB-IDEM-01",
            user=self.parent,
            gateway=GatewayChoices.CHAPA,
            purpose=TransactionPurposeChoices.WALLET_DEPOSIT,
            amount=Decimal('2000.00'),
            status=GatewayTransactionStatus.PENDING
        )

        payload = {
            "tx_ref": tx.tx_ref,
            "status": "success",
            "amount": "2000.00",
            "reference": "CHAPA-IDEM-1"
        }
        sig = self._generate_signature(payload)

        # First webhook call
        res1 = self.client.post(
            '/api/payments/webhook/chapa/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        wallet = self.parent.wallet
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('2000.00'))

        # Duplicate webhook call
        res2 = self.client.post(
            '/api/payments/webhook/chapa/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        # Balance remains 2,000 ETB (not double credited)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('2000.00'))

    def test_invalid_signature_rejected(self):
        tx = GatewayTransaction.objects.create(
            tx_ref="FB-SEC-01",
            user=self.parent,
            gateway=GatewayChoices.CHAPA,
            purpose=TransactionPurposeChoices.WALLET_DEPOSIT,
            amount=Decimal('1000.00'),
            status=GatewayTransactionStatus.PENDING
        )

        payload = {
            "tx_ref": tx.tx_ref,
            "status": "success",
            "amount": "1000.00"
        }

        res = self.client.post(
            '/api/payments/webhook/chapa/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE="invalid_signature_hash"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Transaction remains PENDING
        tx.refresh_from_db()
        self.assertEqual(tx.status, GatewayTransactionStatus.PENDING)

    def test_checkout_verify_endpoint(self):
        tx = GatewayTransaction.objects.create(
            tx_ref="FB-VERIFY-01",
            user=self.parent,
            gateway=GatewayChoices.CHAPA,
            purpose=TransactionPurposeChoices.INVOICE_PAYMENT,
            amount=Decimal('8000.00'),
            status=GatewayTransactionStatus.PENDING,
            related_invoice=self.invoice
        )

        self.client.force_authenticate(user=self.parent)
        res = self.client.get(f'/api/payments/checkout/verify/{tx.tx_ref}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['tx_ref'], tx.tx_ref)
        self.assertEqual(res.data['status'], GatewayTransactionStatus.PENDING)
