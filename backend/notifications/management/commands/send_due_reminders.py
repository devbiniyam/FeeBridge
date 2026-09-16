from datetime import date, timedelta
from django.core.management.base import BaseCommand
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices
from notifications.models import Notification, NotificationTypeChoices
from notifications.services import send_due_reminder


class Command(BaseCommand):
    help = "Sends due reminder notifications for unpaid invoices approaching due date"

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Number of days before the due date to send reminders (default: 3)'
        )

    def handle(self, *args, **options):
        days = options['days']
        today = date.today()
        upcoming_threshold = today + timedelta(days=days)

        invoices = Invoice.objects.filter(
            status=InvoiceStatusChoices.UNPAID,
            due_date__gte=today,
            due_date__lte=upcoming_threshold
        ).select_related('student__parent')

        sent_count = 0
        skipped_count = 0

        for invoice in invoices:
            # Check if reminder already sent for this invoice
            already_sent = Notification.objects.filter(
                related_invoice=invoice,
                notification_type=NotificationTypeChoices.DUE_REMINDER
            ).exists()

            if already_sent:
                skipped_count += 1
                self.stdout.write(f"Reminder already sent for {invoice} - skipped")
                continue

            send_due_reminder(invoice)
            sent_count += 1
            self.stdout.write(self.style.SUCCESS(f"Sent due reminder for {invoice}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Due reminders processed: {sent_count} sent, {skipped_count} skipped."
            )
        )
