from django.core.management.base import BaseCommand
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices
from payments.models import Payment, Receipt
from wallets.models import WalletTransaction, TransactionChoices


class Command(BaseCommand):
    help = "Attempts to pay unpaid invoices automatically using parent wallet balances"

    def handle(self, *args, **kwargs):
        unpaid_invoices = Invoice.objects.filter(status=InvoiceStatusChoices.UNPAID)

        for invoice in unpaid_invoices:
            parent = invoice.student.parent
            wallet = parent.wallet

            if wallet.balance < invoice.amount:
                self.stdout.write(
                    f"Skipped {invoice} - insufficient balance ({wallet.balance} < {invoice.amount})"
                )
                continue

            wallet.balance -= invoice.amount
            wallet.save()

            WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type=TransactionChoices.DEDUCTION,
                amount=invoice.amount,
                related_invoice=invoice
            )

            payment = Payment.objects.create(
                invoice=invoice,
                paid_by=parent,
                amount=invoice.amount,
                method='WALLET'
            )

            invoice.status = InvoiceStatusChoices.PAID
            invoice.save()

            Receipt.objects.create(
                payment=payment,
                receipt_number=f"RCP-{payment.id:06d}"
            )

            self.stdout.write(self.style.SUCCESS(f"Auto-paid {invoice} from wallet"))