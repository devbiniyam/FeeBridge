from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from schools.models import School
from students.models import Student, GenderChoices

User = get_user_model()


class SchoolAndStaffManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            email="superadmin@feebridge.com",
            password="adminpassword123",
            first_name="Super",
            last_name="Admin",
            phone_number="+251911000001",
        )

        # Campuses
        self.school_1 = School.objects.create(
            name="Alpha Academy",
            address="Bole, Addis Ababa",
            phone_number="+251911111111",
            unique_code="ALPHA-01"
        )
        self.school_2 = School.objects.create(
            name="Beta High School",
            address="Hawassa City",
            phone_number="+251922222222",
            unique_code="BETA-02"
        )

        # Staff for school 1
        self.staff_1 = User.objects.create_user(
            email="staff1@alpha.com",
            password="password123",
            first_name="Abebe",
            last_name="Staff",
            phone_number="+251911333333",
            role="STAFF",
            school=self.school_1
        )

        # Parent and student
        self.parent = User.objects.create_user(
            email="parent1@example.com",
            password="password123",
            first_name="Tadesse",
            last_name="Parent",
            phone_number="+251911444444",
            role="PARENT",
        )
        self.student = Student.objects.create(
            full_name="Dawit Tadesse",
            gender=GenderChoices.MALE,
            grade=9,
            section="A",
            parent=self.parent,
            school=self.school_1,
            date_of_birth="2010-01-01"
        )

    def test_admin_can_list_all_schools_with_analytics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/schools/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Verify analytics fields are present
        alpha_data = next(s for s in response.data if s['unique_code'] == 'ALPHA-01')
        self.assertIn('student_count', alpha_data)
        self.assertIn('staff_count', alpha_data)
        self.assertEqual(alpha_data['student_count'], 1)
        self.assertEqual(alpha_data['staff_count'], 1)

    def test_admin_can_create_new_school(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Gamma Model Campus",
            "address": "Adama Center",
            "phone_number": "+251933333333",
            "unique_code": "GAMMA-03"
        }
        response = self.client.post('/api/schools/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(School.objects.filter(unique_code="GAMMA-03").exists())

    def test_staff_cannot_create_school(self):
        self.client.force_authenticate(user=self.staff_1)
        payload = {
            "name": "Unauthorized School",
            "address": "Nowhere",
            "phone_number": "+251999999999",
            "unique_code": "UNAUTH-99"
        }
        response = self.client.post('/api/schools/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_only_sees_their_own_school(self):
        self.client.force_authenticate(user=self.staff_1)
        response = self.client.get('/api/schools/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['unique_code'], 'ALPHA-01')

    def test_parent_only_sees_schools_their_children_attend(self):
        self.client.force_authenticate(user=self.parent)
        response = self.client.get('/api/schools/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.school_1.id)

    def test_admin_can_list_and_filter_staff(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/staff/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['email'], 'staff1@alpha.com')

        # Filter by school
        filter_res = self.client.get(f'/api/staff/?school={self.school_2.id}')
        self.assertEqual(filter_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_res.data), 0)

    def test_admin_can_reassign_staff_school(self):
        self.client.force_authenticate(user=self.admin)
        patch_res = self.client.patch(
            f'/api/staff/{self.staff_1.id}/',
            {"school": self.school_2.id},
            format='json'
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.staff_1.refresh_from_db()
        self.assertEqual(self.staff_1.school, self.school_2)
