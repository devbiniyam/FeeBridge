from datetime import date, timedelta
from io import StringIO
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from payments.models import Payment, Receipt, PaymentChoices
from notifications.models import Notification, NotificationTypeChoices, NotificationStatusChoices


class NotificationModelAndSignalTests(APITestCase):
    def setUp(self):
        self.parent = User.objects.create_user(
            email="parent1@example.com",
            password="Password123!",
            phone_number="+251911111111",
            gender=GenderChoices.MALE,
            role=RoleChoices.PARENT
        )
        self.school = School.objects.create(
            name="Springfield Academy",
            address="123 Main St",
            phone_number="+251900000000",
            unique_code="SCH001"
        )
        self.student = Student.objects.create(
            full_name="Bart Simpson",
            gender=GenderChoices.MALE,
            grade=5,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2015, 1, 1),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee_structure = FeeStructure.objects.create(
            school=self.school,
            grade=5,
            amount=5000.00
        )
        self.invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount=5000.00,
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.UNPAID
        )

    def test_payment_receipt_creation_triggers_notification(self):
        """Creating a Receipt triggers the signal to create a PAYMENT_CONFIRMATION notification."""
        payment = Payment.objects.create(
            invoice=self.invoice,
            paid_by=self.parent,
            amount=5000.00,
            method=PaymentChoices.DIRECT
        )
        receipt = Receipt.objects.create(
            payment=payment,
            receipt_number=f"RCP-{payment.id:06d}"
        )

        notification = Notification.objects.filter(
            recipient=self.parent,
            notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION
        ).first()

        self.assertIsNotNone(notification)
        self.assertEqual(notification.status, NotificationStatusChoices.SENT)
        self.assertEqual(notification.related_invoice, self.invoice)
        self.assertFalse(notification.is_read)
        self.assertIn("Payment Confirmation", notification.message)
        self.assertIn(receipt.receipt_number, notification.message)
        self.assertIn("5000.0", notification.message)
        self.assertIn("Bart Simpson", notification.message)


class NotificationManagementCommandsTests(APITestCase):
    def setUp(self):
        self.parent = User.objects.create_user(
            email="parent2@example.com",
            password="Password123!",
            phone_number="+251922222222",
            role=RoleChoices.PARENT
        )
        self.school = School.objects.create(
            name="Capital School",
            address="456 Center Rd",
            phone_number="+251911112222",
            unique_code="SCH002"
        )
        self.student = Student.objects.create(
            full_name="Lisa Simpson",
            gender=GenderChoices.FEMALE,
            grade=7,
            section="B",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2013, 5, 9),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee_structure = FeeStructure.objects.create(
            school=self.school,
            grade=7,
            amount=6000.00
        )

    def test_send_due_reminders_command(self):
        """Due reminder command notifies unpaid invoices approaching due date within threshold."""
        today = date.today()
        due_soon_invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount=6000.00,
            month=date(today.year, today.month, 1),
            due_date=today + timedelta(days=2),
            status=InvoiceStatusChoices.UNPAID
        )

        out = StringIO()
        call_command('send_due_reminders', days=3, stdout=out)

        notifications = Notification.objects.filter(
            recipient=self.parent,
            notification_type=NotificationTypeChoices.DUE_REMINDER,
            related_invoice=due_soon_invoice
        )
        self.assertEqual(notifications.count(), 1)
        notif = notifications.first()
        self.assertIn("Due Reminder", notif.message)
        self.assertIn("Lisa Simpson", notif.message)

        # Running again should skip sending duplicate
        call_command('send_due_reminders', days=3, stdout=out)
        self.assertEqual(notifications.count(), 1)

    def test_send_overdue_alerts_command(self):
        """Overdue command updates status to OVERDUE and dispatches alert."""
        today = date.today()
        overdue_invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee_structure,
            amount=6000.00,
            month=date(today.year, 1, 1),
            due_date=today - timedelta(days=5),
            status=InvoiceStatusChoices.UNPAID
        )

        out = StringIO()
        call_command('send_overdue_alerts', stdout=out)

        overdue_invoice.refresh_from_db()
        self.assertEqual(overdue_invoice.status, InvoiceStatusChoices.OVERDUE)

        notifications = Notification.objects.filter(
            recipient=self.parent,
            notification_type=NotificationTypeChoices.OVERDUE_ALERT,
            related_invoice=overdue_invoice
        )
        self.assertEqual(notifications.count(), 1)
        notif = notifications.first()
        self.assertIn("Overdue Alert", notif.message)

        # Running again should not duplicate
        call_command('send_overdue_alerts', stdout=out)
        self.assertEqual(notifications.count(), 1)


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.parent1 = User.objects.create_user(
            email="p1@example.com",
            password="Password123!",
            phone_number="+251933333333",
            role=RoleChoices.PARENT
        )
        self.parent2 = User.objects.create_user(
            email="p2@example.com",
            password="Password123!",
            phone_number="+251944444444",
            role=RoleChoices.PARENT
        )
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="Password123!",
            phone_number="+251955555555",
            role=RoleChoices.STAFF
        )

        self.notif1 = Notification.objects.create(
            recipient=self.parent1,
            notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
            message="Payment received for child 1",
            status=NotificationStatusChoices.SENT,
            is_read=False
        )
        self.notif2 = Notification.objects.create(
            recipient=self.parent1,
            notification_type=NotificationTypeChoices.DUE_REMINDER,
            message="Reminder for upcoming fee",
            status=NotificationStatusChoices.SENT,
            is_read=False
        )
        self.notif_other = Notification.objects.create(
            recipient=self.parent2,
            notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
            message="Parent 2 payment confirmation",
            status=NotificationStatusChoices.SENT,
            is_read=False
        )

    def test_parent_lists_only_own_notifications(self):
        self.client.force_authenticate(user=self.parent1)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data]
        self.assertIn(self.notif1.id, ids)
        self.assertIn(self.notif2.id, ids)
        self.assertNotIn(self.notif_other.id, ids)

    def test_staff_lists_all_notifications(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data]
        self.assertIn(self.notif1.id, ids)
        self.assertIn(self.notif2.id, ids)
        self.assertIn(self.notif_other.id, ids)

    def test_unread_filter_and_count(self):
        self.client.force_authenticate(user=self.parent1)
        count_res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(count_res.status_code, status.HTTP_200_OK)
        self.assertEqual(count_res.data['unread_count'], 2)

        # Mark notif1 as read
        self.notif1.is_read = True
        self.notif1.save()

        count_res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 1)

        # Filter by unread
        list_res = self.client.get('/api/notifications/?unread=true')
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['id'], self.notif2.id)

    def test_mark_as_read_endpoint(self):
        self.client.force_authenticate(user=self.parent1)
        res = self.client.post(f'/api/notifications/{self.notif1.id}/mark-as-read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.notif1.refresh_from_db()
        self.assertTrue(self.notif1.is_read)

    def test_mark_all_as_read_endpoint(self):
        self.client.force_authenticate(user=self.parent1)
        res = self.client.post('/api/notifications/mark-all-as-read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['updated_count'], 2)

        self.notif1.refresh_from_db()
        self.notif2.refresh_from_db()
        self.assertTrue(self.notif1.is_read)
        self.assertTrue(self.notif2.is_read)

        # Parent 2 should remain unread
        self.notif_other.refresh_from_db()
        self.assertFalse(self.notif_other.is_read)

    def test_parent_cannot_view_or_mark_other_parent_notification(self):
        self.client.force_authenticate(user=self.parent1)
        # Detail view for other parent's notification
        detail_res = self.client.get(f'/api/notifications/{self.notif_other.id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

        # Mark read for other parent's notification
        mark_res = self.client.post(f'/api/notifications/{self.notif_other.id}/mark-as-read/')
        self.assertEqual(mark_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_cannot_post_notifications(self):
        self.client.force_authenticate(user=self.parent1)
        res = self.client.post('/api/notifications/', {
            "recipient": self.parent2.id,
            "notification_type": NotificationTypeChoices.GENERAL,
            "message": "Hello from parent"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_post_manual_notification(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/notifications/', {
            "recipient": self.parent1.id,
            "notification_type": NotificationTypeChoices.GENERAL,
            "message": "School will be closed this Friday."
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], NotificationStatusChoices.SENT)
        self.assertEqual(res.data['message'], "School will be closed this Friday.")
