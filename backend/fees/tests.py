from decimal import Decimal
from datetime import date
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices
from wallets.models import Wallet


class FeeStructureAPITests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(
            name="Apex Academy",
            address="100 Bole Rd",
            phone_number="+251911000000",
            unique_code="APX01"
        )
        self.parent = User.objects.create_user(
            email="parent_fee@example.com",
            password="Password123!",
            phone_number="+251911111110",
            role=RoleChoices.PARENT
        )
        self.staff = User.objects.create_user(
            email="staff_fee@example.com",
            password="Password123!",
            phone_number="+251911111112",
            role=RoleChoices.STAFF,
            school=self.school
        )
        self.student = Student.objects.create(
            full_name="Abel Tesfaye",
            gender=GenderChoices.MALE,
            grade=8,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2012, 4, 15),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee8 = FeeStructure.objects.create(
            school=self.school,
            grade=8,
            amount=Decimal('3800.00')
        )

    def test_parent_can_list_tuition_rates_for_enrolled_school(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get('/api/fee-structures/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['grade'], 8)
        self.assertEqual(res.data[0]['amount'], '3800.00')
        self.assertEqual(res.data[0]['school_name'], 'Apex Academy')

    def test_parent_cannot_create_fee_structure(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.post('/api/fee-structures/', {
            'grade': 9,
            'amount': '4000.00'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create_fee_structure(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/fee-structures/', {
            'grade': 9,
            'amount': '4200.00'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['grade'], 9)
        self.assertEqual(res.data['amount'], '4200.00')
        self.assertEqual(res.data['school'], self.school.id)

    def test_staff_cannot_create_duplicate_grade_rate(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/fee-structures/', {
            'grade': 8,
            'amount': '3900.00'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_update_grade_rate(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.patch(f'/api/fee-structures/{self.fee8.id}/', {
            'amount': '4100.00'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.fee8.refresh_from_db()
        self.assertEqual(self.fee8.amount, Decimal('4100.00'))


class InstallmentPlanAPITests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(
            name="Apex Academy",
            address="100 Bole Rd",
            phone_number="+251911000000",
            unique_code="APX02"
        )
        self.parent = User.objects.create_user(
            email="parent_inst@example.com",
            password="Password123!",
            phone_number="+251911111120",
            role=RoleChoices.PARENT
        )
        self.staff = User.objects.create_user(
            email="staff_inst@example.com",
            password="Password123!",
            phone_number="+251911111122",
            role=RoleChoices.STAFF,
            school=self.school
        )
        self.student = Student.objects.create(
            full_name="Eden Tadesse",
            gender=GenderChoices.FEMALE,
            grade=8,
            section="B",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2012, 1, 10),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee = FeeStructure.objects.create(
            school=self.school,
            grade=8,
            amount=Decimal('4000.00')
        )
        self.invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee,
            amount=Decimal('4000.00'),
            amount_paid=Decimal('0.00'),
            month=date(2026, 10, 1),
            due_date=date(2026, 10, 10),
            status=InvoiceStatusChoices.UNPAID
        )

    def test_create_2_part_installment_plan(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.post(f'/api/invoices/{self.invoice.id}/installments/', {
            'plan_type': '2_PART'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertTrue(self.invoice.has_installments)
        self.assertEqual(self.invoice.installments.count(), 2)

        inst1 = self.invoice.installments.first()
        inst2 = self.invoice.installments.last()
        self.assertEqual(inst1.amount, Decimal('2000.00'))
        self.assertEqual(inst2.amount, Decimal('2000.00'))
        self.assertEqual(inst1.status, InvoiceStatusChoices.UNPAID)

    def test_create_3_part_installment_plan(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(f'/api/invoices/{self.invoice.id}/installments/', {
            'plan_type': '3_PART'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.installments.count(), 3)
        amounts = [inst.amount for inst in self.invoice.installments.all()]
        self.assertEqual(amounts, [Decimal('1600.00'), Decimal('1200.00'), Decimal('1200.00')])

    def test_parent_can_cancel_unpaid_installment_plan(self):
        self.client.force_authenticate(user=self.parent)
        self.client.post(f'/api/invoices/{self.invoice.id}/installments/', {'plan_type': '2_PART'})
        self.assertEqual(self.invoice.installments.count(), 2)

        res = self.client.delete(f'/api/invoices/{self.invoice.id}/installments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.invoice.refresh_from_db()
        self.assertFalse(self.invoice.has_installments)
        self.assertEqual(self.invoice.installments.count(), 0)

    def test_pay_specific_milestone_with_wallet(self):
        wallet, _ = Wallet.objects.get_or_create(parent=self.parent)
        wallet.balance = Decimal('5000.00')
        wallet.save()
        self.parent.refresh_from_db()
        self.client.force_authenticate(user=self.parent)
        # Create 2-part plan
        self.client.post(f'/api/invoices/{self.invoice.id}/installments/', {'plan_type': '2_PART'})
        inst1 = self.invoice.installments.first()

        # Pay milestone 1
        res = self.client.post('/api/wallets/pay-invoice/', {
            'invoice': self.invoice.id,
            'amount': '2000.00',
            'installment': inst1.id
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        inst1.refresh_from_db()
        self.invoice.refresh_from_db()
        wallet.refresh_from_db()

        self.assertEqual(inst1.status, InvoiceStatusChoices.PAID)
        self.assertEqual(inst1.amount_paid, Decimal('2000.00'))
        self.assertEqual(self.invoice.amount_paid, Decimal('2000.00'))
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PARTIALLY_PAID)
        self.assertEqual(wallet.balance, Decimal('3000.00'))


class AutoPayAPITests(APITestCase):
    def setUp(self):
        from wallets.models import Wallet
        self.school = School.objects.create(
            name="Apex Academy",
            address="100 Bole Rd",
            phone_number="+251911000000",
            unique_code="APX03"
        )
        self.parent = User.objects.create_user(
            email="parent_auto@example.com",
            password="Password123!",
            phone_number="+251911111130",
            role=RoleChoices.PARENT
        )
        self.staff = User.objects.create_user(
            email="staff_auto@example.com",
            password="Password123!",
            phone_number="+251911111132",
            role=RoleChoices.STAFF,
            school=self.school
        )
        self.student = Student.objects.create(
            full_name="Kidus Solomon",
            gender=GenderChoices.MALE,
            grade=8,
            section="A",
            parent=self.parent,
            school=self.school,
            date_of_birth=date(2012, 3, 20),
            status=StudentStatusChoices.ACTIVE
        )
        self.fee = FeeStructure.objects.create(
            school=self.school,
            grade=8,
            amount=Decimal('2500.00')
        )
        self.invoice = Invoice.objects.create(
            student=self.student,
            fee_structure=self.fee,
            amount=Decimal('2500.00'),
            amount_paid=Decimal('0.00'),
            month=date(2026, 10, 1),
            due_date=date(2026, 10, 10),
            status=InvoiceStatusChoices.UNPAID
        )
        self.wallet, _ = Wallet.objects.get_or_create(parent=self.parent)
        self.wallet.balance = Decimal('6000.00')
        self.wallet.auto_pay_enabled = False
        self.wallet.low_balance_threshold = Decimal('500.00')
        self.wallet.save()

    def test_parent_can_toggle_auto_pay(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.post('/api/wallets/toggle-auto-pay/', {
            'auto_pay_enabled': True,
            'low_balance_threshold': '800.00'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.wallet.refresh_from_db()
        self.assertTrue(self.wallet.auto_pay_enabled)
        self.assertEqual(self.wallet.low_balance_threshold, Decimal('800.00'))

    def test_staff_can_run_auto_pay_batch(self):
        self.wallet.auto_pay_enabled = True
        self.wallet.save()

        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/invoices/auto-pay-run/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['settled_count'], 1)

        self.invoice.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(self.invoice.status, InvoiceStatusChoices.PAID)
        self.assertEqual(self.wallet.balance, Decimal('3500.00'))

