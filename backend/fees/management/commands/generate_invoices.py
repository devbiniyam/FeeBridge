from datetime import date
from django.core.management.base import BaseCommand
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices


class Command(BaseCommand):
    help = "Generates monthly invoices for all active students"

    def handle(self, *args, **kwargs):
        today = date.today()
        current_month = date(today.year, today.month, 1)

        active_students = Student.objects.filter(status=StudentStatusChoices.ACTIVE)

        for student in active_students:
            try:
                fee_structure = FeeStructure.objects.get(
                    school=student.school,
                    grade=student.grade
                )
            except FeeStructure.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"No fee structure for {student} (grade {student.grade}) - skipped"
                ))
                continue

            invoice, created = Invoice.objects.get_or_create(
                student=student,
                month=current_month,
                defaults={
                    'fee_structure': fee_structure,
                    'amount': fee_structure.amount,
                    'due_date': date(today.year, today.month, 10),
                    'status': InvoiceStatusChoices.UNPAID,
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created invoice for {student}"))
            else:
                self.stdout.write(f"Invoice already exists for {student} this month - skipped")