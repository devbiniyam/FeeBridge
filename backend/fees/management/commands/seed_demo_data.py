from datetime import date
from decimal import Decimal
from django.core.management.base import BaseCommand
from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from wallets.models import Wallet


class Command(BaseCommand):
    help = "Seeds demo users, schools, students, and invoices for production testing."

    def handle(self, *args, **options):
        self.stdout.write("Starting demo data seeding...")

        # 1. School
        school, created = School.objects.get_or_create(
            unique_code="Ad1001",
            defaults={
                "name": "ASTU Special Academy",
                "address": "Adama, Ethiopia",
                "phone_number": "0911000000",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created School: {school.name}"))
        else:
            self.stdout.write(f"School already exists: {school.name}")

        # 2. Admin User (bini@gmail.com / 12345678)
        admin, created = User.objects.get_or_create(
            email="bini@gmail.com",
            defaults={
                "phone_number": "0911223344",
                "first_name": "Biniyam",
                "last_name": "Admin",
                "role": RoleChoices.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password("12345678")
        admin.role = RoleChoices.ADMIN
        admin.is_staff = True
        admin.is_superuser = True
        admin.school = school
        admin.save()
        self.stdout.write(self.style.SUCCESS("Admin user synced: bini@gmail.com"))

        # 3. Staff User (newstaff@example.com / 12345678)
        staff, created = User.objects.get_or_create(
            email="newstaff@example.com",
            defaults={
                "phone_number": "0944556677",
                "first_name": "Dave",
                "last_name": "Staff",
                "role": RoleChoices.STAFF,
                "school": school,
            },
        )
        staff.set_password("12345678")
        staff.role = RoleChoices.STAFF
        staff.school = school
        staff.save()
        self.stdout.write(self.style.SUCCESS("Staff user synced: newstaff@example.com"))

        # 4. Parent User (tinsaye@gmail.com / 12345678)
        parent, created = User.objects.get_or_create(
            email="tinsaye@gmail.com",
            defaults={
                "phone_number": "0966338211",
                "first_name": "Tinsaye",
                "last_name": "Parent",
                "role": RoleChoices.PARENT,
            },
        )
        parent.set_password("12345678")
        parent.role = RoleChoices.PARENT
        parent.save()
        self.stdout.write(self.style.SUCCESS("Parent user synced: tinsaye@gmail.com"))

        # 5. Parent's Wallet
        wallet, _ = Wallet.objects.get_or_create(parent=parent)
        if wallet.balance < Decimal("1000.00"):
            wallet.balance = Decimal("5000.00")
            wallet.auto_pay_enabled = True
            wallet.save()
            self.stdout.write(self.style.SUCCESS(f"Seeded Wallet balance: {wallet.balance} ETB"))

        # 6. Students
        student1, _ = Student.objects.get_or_create(
            parent=parent,
            full_name="Nardos T",
            defaults={
                "gender": GenderChoices.FEMALE,
                "grade": 12,
                "section": "1",
                "school": school,
                "date_of_birth": date(2008, 1, 15),
                "status": StudentStatusChoices.ACTIVE,
            },
        )

        student2, _ = Student.objects.get_or_create(
            parent=parent,
            full_name="Elsa Zeru",
            defaults={
                "gender": GenderChoices.FEMALE,
                "grade": 12,
                "section": "1",
                "school": school,
                "date_of_birth": date(2008, 5, 20),
                "status": StudentStatusChoices.ACTIVE,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Students synced: {student1.full_name}, {student2.full_name}"))

        # 7. Fee Structures
        fee12, _ = FeeStructure.objects.get_or_create(
            school=school,
            grade=12,
            defaults={"amount": Decimal("3500.00")},
        )
        fee10, _ = FeeStructure.objects.get_or_create(
            school=school,
            grade=10,
            defaults={"amount": Decimal("2500.00")},
        )

        # 8. Sample Invoices for current and upcoming months
        today = date.today()
        current_month = date(today.year, today.month, 1)

        # Unpaid invoice for testing payment
        inv_unpaid, _ = Invoice.objects.get_or_create(
            student=student1,
            month=current_month,
            defaults={
                "fee_structure": fee12,
                "amount": fee12.amount,
                "amount_paid": Decimal("0.00"),
                "due_date": date(today.year, today.month, min(28, today.day + 7)),
                "status": InvoiceStatusChoices.UNPAID,
            },
        )

        # Paid past invoice for testing receipt & history
        past_month_val = 12 if today.month == 1 else today.month - 1
        past_year_val = today.year - 1 if today.month == 1 else today.year
        past_month = date(past_year_val, past_month_val, 1)

        inv_paid, _ = Invoice.objects.get_or_create(
            student=student1,
            month=past_month,
            defaults={
                "fee_structure": fee12,
                "amount": fee12.amount,
                "amount_paid": fee12.amount,
                "due_date": date(past_year_val, past_month_val, 10),
                "status": InvoiceStatusChoices.PAID,
            },
        )

        # Partially paid invoice for Elsa
        inv_partial, _ = Invoice.objects.get_or_create(
            student=student2,
            month=current_month,
            defaults={
                "fee_structure": fee12,
                "amount": fee12.amount,
                "amount_paid": Decimal("1500.00"),
                "due_date": date(today.year, today.month, min(28, today.day + 5)),
                "status": InvoiceStatusChoices.PARTIALLY_PAID,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo seeding completed successfully!"))
