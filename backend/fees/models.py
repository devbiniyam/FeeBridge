from decimal import Decimal
from django.db import models
from students.models import Student
from schools.models import School


class FeeStructure(models.Model):
    school = models.ForeignKey(School, on_delete=models.PROTECT, related_name="fee_structures")
    grade = models.IntegerField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['school', 'grade'], name='unique_school_grade_fee')
        ]

    def __str__(self):
        return f"{self.school} - Grade {self.grade}: {self.amount} ETB"


class StatusChoices(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Paid"
    OVERDUE = "OVERDUE", "Overdue"


class Invoice(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="invoices")
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.PROTECT, related_name="invoices")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    month = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.UNPAID)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def balance_remaining(self):
        return max(Decimal('0.00'), self.amount - self.amount_paid)

    @property
    def has_installments(self):
        return self.installments.exists()

    @property
    def installments_count(self):
        return self.installments.count()

    @property
    def paid_installments_count(self):
        return self.installments.filter(status=StatusChoices.PAID).count()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['student', 'month'], name='unique_student_month_invoice')
        ]

    def __str__(self):
        return f"{self.student} - {self.month.strftime('%B %Y')} ({self.status})"


class InvoiceInstallment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="installments")
    installment_number = models.PositiveSmallIntegerField(default=1)
    title = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.UNPAID)
    paid_at = models.DateTimeField(null=True, blank=True)

    @property
    def balance_remaining(self):
        return max(Decimal('0.00'), self.amount - self.amount_paid)

    @property
    def is_paid(self):
        return self.amount_paid >= self.amount

    class Meta:
        ordering = ['installment_number']
        constraints = [
            models.UniqueConstraint(fields=['invoice', 'installment_number'], name='unique_invoice_installment')
        ]

    def __str__(self):
        return f"Installment #{self.installment_number} - {self.title}: {self.amount} ETB ({self.status})"