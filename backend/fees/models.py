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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['student', 'month'], name='unique_student_month_invoice')
        ]

    def __str__(self):
        return f"{self.student} - {self.month.strftime('%B %Y')} ({self.status})"