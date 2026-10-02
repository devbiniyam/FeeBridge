from datetime import date
from decimal import Decimal
from django.core.management.base import BaseCommand
from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from wallets.models import Wallet


class Command(BaseCommand):
    help = "Seeds common demo users (John Doe, Sarah Smith, Robert Johnson), students, and invoices."

    def handle(self, *args, **options):
        self.stdout.write("Starting demo data seeding...")

        # 1. School
        school, _ = School.objects.get_or_create(
            unique_code="SCH1001",
            defaults={
                "name": "Springfield Academy",
                "address": "100 Education Blvd",
                "phone_number": "+1 555-0199",
            },
        )
        school.name = "Springfield Academy"
        school.save()
        self.stdout.write(self.style.SUCCESS(f"School synced: {school.name}"))

        # 2. Admin User (John Doe / admin@feebridge.com)
        admin, _ = User.objects.get_or_create(
            email="admin@feebridge.com",
            defaults={
                "phone_number": "+15550001",
                "first_name": "John",
                "last_name": "Doe",
                "role": RoleChoices.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.first_name = "John"
        admin.last_name = "Doe"
        admin.set_password("12345678")
        admin.role = RoleChoices.ADMIN
        admin.is_staff = True
        admin.is_superuser = True
        admin.school = school
        admin.save()
        self.stdout.write(self.style.SUCCESS("Admin user synced: John Doe (admin@feebridge.com)"))

        # 3. Staff User (Sarah Smith / staff@feebridge.com)
        staff, _ = User.objects.get_or_create(
            email="staff@feebridge.com",
            defaults={
                "phone_number": "+15550002",
                "first_name": "Sarah",
                "last_name": "Smith",
                "role": RoleChoices.STAFF,
                "school": school,
            },
        )
        staff.first_name = "Sarah"
        staff.last_name = "Smith"
        staff.set_password("12345678")
        staff.role = RoleChoices.STAFF
        staff.school = school
        staff.save()
        self.stdout.write(self.style.SUCCESS("Staff user synced: Sarah Smith (staff@feebridge.com)"))

        # 4. Parent User (Robert Johnson / parent@feebridge.com)
        parent, _ = User.objects.get_or_create(
            email="parent@feebridge.com",
            defaults={
                "phone_number": "+15550003",
                "first_name": "Robert",
                "last_name": "Johnson",
                "role": RoleChoices.PARENT,
            },
        )
        parent.first_name = "Robert"
        parent.last_name = "Johnson"
        parent.set_password("12345678")
        parent.role = RoleChoices.PARENT
        parent.save()
        self.stdout.write(self.style.SUCCESS("Parent user synced: Robert Johnson (parent@feebridge.com)"))

        # 5. Parent's Wallet
        wallet, _ = Wallet.objects.get_or_create(parent=parent)
        if wallet.balance < Decimal("1000.00"):
            wallet.balance = Decimal("5000.00")
            wallet.auto_pay_enabled = True
            wallet.save()
            self.stdout.write(self.style.SUCCESS(f"Seeded Wallet balance: {wallet.balance} ETB"))

        # 6. Students (Alex Johnson and Emily Johnson)
        student1, _ = Student.objects.get_or_create(
            parent=parent,
            full_name="Alex Johnson",
            defaults={
                "gender": GenderChoices.MALE,
                "grade": 12,
                "section": "A",
                "school": school,
                "date_of_birth": date(2008, 3, 14),
                "status": StudentStatusChoices.ACTIVE,
            },
        )
        student1.school = school
        student1.save()

        student2, _ = Student.objects.get_or_create(
            parent=parent,
            full_name="Emily Johnson",
            defaults={
                "gender": GenderChoices.FEMALE,
                "grade": 12,
                "section": "A",
                "school": school,
                "date_of_birth": date(2008, 9, 22),
                "status": StudentStatusChoices.ACTIVE,
            },
        )
        student2.school = school
        student2.save()

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

        # 8. Sample Invoices
        today = date.today()
        current_month = date(today.year, today.month, 1)

        # Unpaid invoice for Alex
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

        # Paid past invoice for Alex
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

        # Partially paid invoice for Emily
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

        # Also support legacy demo accounts if they were created earlier
        for email, pwd in [("bini@gmail.com", "12345678"), ("tinsaye@gmail.com", "12345678"), ("newstaff@example.com", "12345678")]:
            legacy_u = User.objects.filter(email=email).first()
            if legacy_u:
                legacy_u.set_password(pwd)
                legacy_u.save()

        self.stdout.write(self.style.SUCCESS("All demo accounts and common names seeded successfully!"))
