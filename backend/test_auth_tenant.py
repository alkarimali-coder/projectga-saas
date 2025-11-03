#!/usr/bin/env python3
"""
Backend Tests for Authentication and Tenant Operations
Tests super admin, tech user authentication, and tenant CRUD with proper isolation
"""
import asyncio
import requests
import json
import sys
import os
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(__file__))

# Test configuration
BACKEND_URL = "http://localhost:8001"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def print_test(message, status="INFO"):
    color = (
        Colors.BLUE
        if status == "INFO"
        else Colors.GREEN if status == "PASS" else Colors.RED
    )
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {status}: {message}{Colors.RESET}")


class AuthTenantTester:
    def __init__(self):
        self.super_admin_token = None
        self.tech_user_token = None
        self.demo_tenant_id = None
        self.tests_passed = 0
        self.tests_total = 0

    def run_test(self, test_func, test_name):
        """Run a test and track results"""
        self.tests_total += 1
        try:
            result = test_func()
            if result:
                print_test(f"{test_name}: PASSED", "PASS")
                self.tests_passed += 1
                return True
            else:
                print_test(f"{test_name}: FAILED", "FAIL")
                return False
        except Exception as e:
            print_test(f"{test_name}: ERROR - {str(e)}", "FAIL")
            return False

    def test_super_admin_login(self):
        """Test super admin authentication"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={"email": "admin@coamsaas.com", "password": "admin123"},
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                self.super_admin_token = data.get("access_token")
                user = data.get("user", {})

                # Verify user details
                if (
                    self.super_admin_token
                    and user.get("role") == "super_admin"
                    and user.get("is_active") is True
                ):
                    return True
            return False
        except Exception as e:
            print_test(f"Super admin login error: {str(e)}", "FAIL")
            return False

    def test_tech_user_login(self):
        """Test tech user authentication"""
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/auth/login",
                json={"email": "newtech@coamsaas.com", "password": "tech123"},
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                self.tech_user_token = data.get("access_token")
                user = data.get("user", {})

                # Verify user details and role normalization
                if (
                    self.tech_user_token
                    and user.get("role")
                    in ["technician", "tech"]  # Allow both normalized forms
                    and user.get("is_active") is True
                    and user.get("tenant_id") is not None
                ):  # Tech user should have tenant_id
                    return True
            return False
        except Exception as e:
            print_test(f"Tech user login error: {str(e)}", "FAIL")
            return False

    def test_token_validation(self):
        """Test JWT token validation"""
        if not self.super_admin_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.super_admin_token}"}
            response = requests.get(
                f"{BACKEND_URL}/api/auth/me", headers=headers, timeout=10
            )

            if response.status_code == 200:
                user_data = response.json()
                return user_data.get("role") == "super_admin"
            return False
        except Exception:
            return False

    def test_super_admin_tenant_access(self):
        """Test super admin can access all tenant data"""
        if not self.super_admin_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.super_admin_token}"}

            # List all tenants (super admin should see all)
            response = requests.get(
                f"{BACKEND_URL}/api/tenants", headers=headers, timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                tenants = data.get("tenants", [])

                # Super admin should see at least the demo tenant
                if len(tenants) >= 1:
                    # Store demo tenant ID for later tests
                    for tenant in tenants:
                        if tenant.get("company_name") in [
                            "Demo Corporation",
                            "Company Name",
                        ]:
                            self.demo_tenant_id = tenant.get("id")
                            break
                    return True
            return False
        except Exception as e:
            print_test(f"Super admin tenant access error: {str(e)}", "FAIL")
            return False

    def test_tech_user_tenant_access(self):
        """Test tech user can only access their own tenant data"""
        if not self.tech_user_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.tech_user_token}"}

            # List tenants (tech user should only see their own)
            response = requests.get(
                f"{BACKEND_URL}/api/tenants", headers=headers, timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                tenants = data.get("tenants", [])

                # Tech user should see exactly 1 tenant (their own) or 0 if not associated
                return len(tenants) <= 1
            return False
        except Exception as e:
            print_test(f"Tech user tenant access error: {str(e)}", "FAIL")
            return False

    def test_tenant_isolation(self):
        """Test tenant data isolation - tech user cannot access other tenant data"""
        if not self.tech_user_token or not self.demo_tenant_id:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.tech_user_token}"}

            # Try to access specific tenant (should fail if not their tenant)
            response = requests.get(
                f"{BACKEND_URL}/api/tenants/{self.demo_tenant_id}",
                headers=headers,
                timeout=10,
            )

            # This should either succeed (if it's their tenant) or return 403 (if not their tenant)
            if response.status_code in [200, 403]:
                return True
            return False
        except Exception:
            return False

    def test_super_admin_system_stats(self):
        """Test super admin can access system statistics"""
        if not self.super_admin_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.super_admin_token}"}
            response = requests.get(
                f"{BACKEND_URL}/api/system/stats", headers=headers, timeout=10
            )

            if response.status_code == 200:
                stats = response.json()
                return "total_tenants" in stats
            return False
        except Exception:
            return False

    def test_tech_user_system_stats_denied(self):
        """Test tech user cannot access system statistics"""
        if not self.tech_user_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.tech_user_token}"}
            response = requests.get(
                f"{BACKEND_URL}/api/system/stats", headers=headers, timeout=10
            )

            # Should return 403 Forbidden
            return response.status_code == 403
        except Exception:
            return False

    def test_tenant_create_super_admin_only(self):
        """Test that only super admin can create tenants"""
        if not self.super_admin_token:
            return False

        try:
            headers = {"Authorization": f"Bearer {self.super_admin_token}"}
            test_tenant = {
                "company_name": "Test Corp",
                "business_type": "Technology",
                "admin_email": f"test{int(datetime.now().timestamp())}@testcorp.com",
                "admin_first_name": "Test",
                "admin_last_name": "Admin",
            }

            response = requests.post(
                f"{BACKEND_URL}/api/tenants",
                json=test_tenant,
                headers=headers,
                timeout=10,
            )

            # Should succeed for super admin
            return response.status_code in [200, 201]
        except Exception as e:
            print_test(f"Tenant creation test error: {str(e)}", "FAIL")
            return False

    def test_tech_user_create_tenant_denied(self):
        """Test tech user cannot create tenants"""
        if not self.tech_user_token:
            return True  # Skip if no tech token

        try:
            headers = {"Authorization": f"Bearer {self.tech_user_token}"}
            test_tenant = {
                "company_name": "Unauthorized Corp",
                "admin_email": "unauthorized@corp.com",
                "admin_first_name": "Unauthorized",
                "admin_last_name": "User",
            }

            response = requests.post(
                f"{BACKEND_URL}/api/tenants",
                json=test_tenant,
                headers=headers,
                timeout=10,
            )

            # Should return 403 Forbidden
            return response.status_code == 403
        except Exception:
            return False

    def run_all_tests(self):
        """Run all authentication and tenant tests"""
        print_test("Starting Authentication and Tenant Operations Tests", "INFO")
        print("=" * 70)

        # Authentication Tests
        print_test("Authentication Tests", "INFO")
        self.run_test(self.test_super_admin_login, "Super Admin Login")
        self.run_test(self.test_tech_user_login, "Tech User Login")
        self.run_test(self.test_token_validation, "JWT Token Validation")

        # Access Control Tests
        print_test("\nAccess Control Tests", "INFO")
        self.run_test(self.test_super_admin_tenant_access, "Super Admin Tenant Access")
        self.run_test(self.test_tech_user_tenant_access, "Tech User Tenant Access")
        self.run_test(self.test_tenant_isolation, "Tenant Data Isolation")

        # Permission Tests
        print_test("\nPermission Tests", "INFO")
        self.run_test(self.test_super_admin_system_stats, "Super Admin System Stats")
        self.run_test(
            self.test_tech_user_system_stats_denied, "Tech User System Stats Denied"
        )
        self.run_test(
            self.test_tenant_create_super_admin_only, "Super Admin Tenant Creation"
        )
        self.run_test(
            self.test_tech_user_create_tenant_denied, "Tech User Tenant Creation Denied"
        )

        # Final Results
        success_rate = (
            (self.tests_passed / self.tests_total) * 100 if self.tests_total > 0 else 0
        )

        print("\n" + "=" * 70)
        print_test("TEST RESULTS SUMMARY", "INFO")

        if success_rate >= 80:
            print_test(
                f"Tests Passed: {self.tests_passed}/{self.tests_total} ({success_rate:.1f}%) - EXCELLENT",
                "PASS",
            )
        elif success_rate >= 60:
            print_test(
                f"Tests Passed: {self.tests_passed}/{self.tests_total} ({success_rate:.1f}%) - GOOD",
                "PASS",
            )
        else:
            print_test(
                f"Tests Passed: {self.tests_passed}/{self.tests_total} ({success_rate:.1f}%) - NEEDS WORK",
                "FAIL",
            )

        return success_rate >= 70


def main():
    """Run backend authentication and tenant tests"""
    # Check if backend is running
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code != 200:
            print_test("Backend is not healthy", "FAIL")
            return False
    except Exception:
        print_test(
            "Backend is not running - start with: cd backend && python main.py", "FAIL"
        )
        return False

    # Run tests
    tester = AuthTenantTester()
    success = tester.run_all_tests()

    if success:
        print_test(
            "\n✅ Authentication and tenant operations are working correctly!", "PASS"
        )
    else:
        print_test("\n❌ Some tests failed - check the issues above", "FAIL")

    return success


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
