from datetime import date
from django.core.management.base import BaseCommand
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices
from notifications.models import Notification, NotificationTypeChoices
from notifications.services import send_overdue_alert


class Command(BaseCommand):
    help = "Updates past-due unpaid invoices to OVERDUE and sends overdue alerts"

    def handle(self, *args, **options):
        today = date.today()

        overdue_invoices = Invoice.objects.filter(
            due_date__lt=today,
            status__in=[InvoiceStatusChoices.UNPAID, InvoiceStatusChoices.OVERDUE]
        ).select_related('student__parent')

        updated_count = 0
        sent_count = 0
        skipped_count = 0

        for invoice in overdue_invoices:
            # Update status to OVERDUE if still marked UNPAID
            if invoice.status == InvoiceStatusChoices.UNPAID:
                invoice.status = InvoiceStatusChoices.OVERDUE
                invoice.save()
                updated_count += 1

            # Check if overdue alert was already sent for this invoice
            already_sent = Notification.objects.filter(
                related_invoice=invoice,
                notification_type=NotificationTypeChoices.OVERDUE_ALERT
            ).exists()

            if already_sent:
                skipped_count += 1
                self.stdout.write(f"Overdue alert already sent for {invoice} - skipped")
                continue

            send_overdue_alert(invoice)
            sent_count += 1
            self.stdout.write(self.style.SUCCESS(f"Sent overdue alert for {invoice}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Overdue alerts processed: {updated_count} invoice(s) marked overdue, "
                f"{sent_count} alert(s) sent, {skipped_count} skipped."
            )
        )
