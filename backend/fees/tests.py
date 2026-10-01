from decimal import Decimal
from datetime import date
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, RoleChoices, GenderChoices
from schools.models import School
from students.models import Student, StatusChoices as StudentStatusChoices
from fees.models import FeeStructure, Invoice, StatusChoices as InvoiceStatusChoices


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
