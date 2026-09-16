from datetime import date
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from payments.models import PaymentChoices
from wallets.models import Wallet, WalletTransaction, TransactionChoices


class MultiTenancyAndScopingTests(APITestCase):
    def setUp(self):
        # Create two distinct schools
        self.school_a = School.objects.create(
            name="School Alpha",
            address="Street A",
            phone_number="+251911000001",
            unique_code="SCH-A"
        )
        self.school_b = School.objects.create(
            name="School Beta",
            address="Street B",
            phone_number="+251911000002",
            unique_code="SCH-B"
        )

        # Create staff for each school
        self.staff_a = User.objects.create_user(
            email="staff_a@school.com",
            password="Password123!",
            phone_number="+251911000003",
            role=RoleChoices.STAFF,
            school=self.school_a
        )
        self.staff_b = User.objects.create_user(
            email="staff_b@school.com",
            password="Password123!",
            phone_number="+251911000004",
            role=RoleChoices.STAFF,
            school=self.school_b
        )

        # Parent and students
        self.parent = User.objects.create_user(
            email="parent_ab@school.com",
            password="Password123!",
            phone_number="+251911000005",
            role=RoleChoices.PARENT
        )
        self.student_a = Student.objects.create(
            full_name="Alice Alpha",
            gender=GenderChoices.FEMALE,
            grade=1,
            section="A",
            parent=self.parent,
            school=self.school_a,
            date_of_birth=date(2018, 1, 1),
            status=StudentStatusChoices.ACTIVE
        )
        self.student_b = Student.objects.create(
            full_name="Bob Beta",
            gender=GenderChoices.MALE,
            grade=2,
            section="B",
            parent=self.parent,
            school=self.school_b,
            date_of_birth=date(2017, 1, 1),
            status=StudentStatusChoices.ACTIVE
        )

        # Fee structures
        self.fee_a = FeeStructure.objects.create(
            school=self.school_a,
            grade=1,
            amount=Decimal('4000.00')
        )
        self.fee_b = FeeStructure.objects.create(
            school=self.school_b,
            grade=2,
            amount=Decimal('5500.00')
        )

        # Invoices
        self.invoice_a = Invoice.objects.create(
            student=self.student_a,
            fee_structure=self.fee_a,
            amount=Decimal('4000.00'),
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.UNPAID
        )
        self.invoice_b = Invoice.objects.create(
            student=self.student_b,
            fee_structure=self.fee_b,
            amount=Decimal('5500.00'),
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.UNPAID
        )

    def test_staff_a_only_sees_students_from_school_a(self):
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.get('/api/students/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [s['id'] for s in res.data]
        self.assertIn(self.student_a.id, ids)
        self.assertNotIn(self.student_b.id, ids)

    def test_staff_a_only_sees_invoices_from_school_a(self):
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.get('/api/invoices/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [inv['id'] for inv in res.data]
        self.assertIn(self.invoice_a.id, ids)
        self.assertNotIn(self.invoice_b.id, ids)

    def test_staff_a_only_sees_fee_structures_from_school_a(self):
        self.client.force_authenticate(user=self.staff_a)
        res = self.client.get('/api/fee-structures/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [f['id'] for f in res.data]
        self.assertIn(self.fee_a.id, ids)
        self.assertNotIn(self.fee_b.id, ids)


class PartialPaymentAndWalletTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(
            name="Main School",
            address="Main St",
            phone_number="+251911999888",
            unique_code="SCH-MAIN"
        )
        self.parent = User.objects.create_user(
            email="parent_wallet@test.com",
            password="Password123!",
            phone_number="+251911999777",
            role=RoleChoices.PARENT
        )
        self.student = Student.objects.create(
            full_name="Charlie Brown",
            gender=GenderChoices.MALE,
            grade=3,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2016, 3, 1),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee = FeeStructure.objects.create(
            school=self.school,
            grade=3,
            amount=Decimal('10000.00')
        )
        self.invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee,
            amount=Decimal('10000.00'),
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.UNPAID
        )

    def test_direct_partial_payment_then_full_completion(self):
        self.client.force_authenticate(user=self.parent)

        # 1. Pay 3,000 ETB partially
        res1 = self.client.post('/api/payments/', {
            "invoice": self.invoice.id,
            "amount": "3000.00",
            "method": PaymentChoices.DIRECT
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('3000.00'))
        self.assertEqual(self.invoice.balance_remaining, Decimal('7000.00'))
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PARTIALLY_PAID)

        # 2. Pay remaining 7,000 ETB
        res2 = self.client.post('/api/payments/', {
            "invoice": self.invoice.id,
            "amount": "7000.00",
            "method": PaymentChoices.DIRECT
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('10000.00'))
        self.assertEqual(self.invoice.balance_remaining, Decimal('0.00'))
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PAID)

    def test_wallet_deposit_and_partial_payment(self):
        self.client.force_authenticate(user=self.parent)

        # Deposit 8,000 ETB to wallet
        dep_res = self.client.post('/api/wallets/deposit/', {
            "amount": "8000.00"
        })
        self.assertEqual(dep_res.status_code, status.HTTP_201_CREATED)

        wallet = self.parent.wallet
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('8000.00'))

        # Pay 4,000 ETB from wallet
        pay_res = self.client.post('/api/wallets/pay-invoice/', {
            "invoice": self.invoice.id,
            "amount": "4000.00"
        })
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('4000.00'))

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.amount_paid, Decimal('4000.00'))
        self.assertEqual(self.invoice.balance_remaining, Decimal('6000.00'))
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PARTIALLY_PAID)

    def test_overpayment_rejected(self):
        self.client.force_authenticate(user=self.parent)

        # Try to pay 15,000 ETB on 10,000 ETB invoice
        res = self.client.post('/api/payments/', {
            "invoice": self.invoice.id,
            "amount": "15000.00",
            "method": PaymentChoices.DIRECT
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ReportingAPITests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(
            name="Report Academy",
            address="Academics Way",
            phone_number="+251911999666",
            unique_code="SCH-REP"
        )
        self.staff = User.objects.create_user(
            email="report_staff@test.com",
            password="Password123!",
            phone_number="+251911999555",
            role=RoleChoices.STAFF,
            school=self.school
        )
        self.parent = User.objects.create_user(
            email="report_parent@test.com",
            password="Password123!",
            phone_number="+251911999444",
            role=RoleChoices.PARENT
        )

        self.s1 = Student.objects.create(
            full_name="Student 1",
            gender=GenderChoices.FEMALE,
            grade=4,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2015, 1, 1),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee = FeeStructure.objects.create(
            school=self.school,
            grade=4,
            amount=Decimal('5000.00')
        )
        # Invoice 1: fully paid
        Invoice.objects.create(
            student=self.s1,
            fee_structure=self.fee,
            amount=Decimal('5000.00'),
            amount_paid=Decimal('5000.00'),
            month=date(2026, 9, 1),
            due_date=date(2026, 9, 10),
            status=InvoiceStatusChoices.PAID
        )
        # Invoice 2: partially paid (2000 of 5000)
        Invoice.objects.create(
            student=self.s1,
            fee_structure=self.fee,
            amount=Decimal('5000.00'),
            amount_paid=Decimal('2000.00'),
            month=date(2026, 8, 1),
            due_date=date(2026, 8, 10),
            status=InvoiceStatusChoices.PARTIALLY_PAID
        )

    def test_financial_summary_report(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get('/api/reports/financial-summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Total billed: 10,000 ETB, Collected: 7,000 ETB, Outstanding: 3,000 ETB
        self.assertEqual(Decimal(str(res.data['total_billed'])), Decimal('10000.00'))
        self.assertEqual(Decimal(str(res.data['total_collected'])), Decimal('7000.00'))
        self.assertEqual(Decimal(str(res.data['total_outstanding'])), Decimal('3000.00'))
        self.assertEqual(res.data['collection_rate_percentage'], 70.0)
        self.assertEqual(res.data['invoices_breakdown']['paid'], 1)
        self.assertEqual(res.data['invoices_breakdown']['partially_paid'], 1)

    def test_grade_breakdown_report(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get('/api/reports/grade-breakdown/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['grades']), 1)
        grade_stat = res.data['grades'][0]
        self.assertEqual(grade_stat['grade'], 4)
        self.assertEqual(Decimal(str(grade_stat['total_billed'])), Decimal('10000.00'))
        self.assertEqual(Decimal(str(grade_stat['total_collected'])), Decimal('7000.00'))
