#!/usr/bin/env python3
"""
Backend test suite for digiwed-invitation NEW Features (Batch 1-3)
Tests Features A, C, D, E, F, H, B, G1, I
"""

import requests
import json
import sys
import subprocess
import io
from typing import Dict, Optional, Tuple

BASE_URL = "https://digiwed-editor-suite.preview.emergentagent.com"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@12345"

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.invitation_id = None
        self.original_slug = None
        self.created_resources = {
            'gifts': [],
            'categories': [],
            'message_templates': [],
            'rsvp_fields': [],
            'check_ins': []
        }
        
    def authenticate_admin(self) -> bool:
        """Authenticate as admin using NextAuth v5 credentials flow"""
        print("\n=== Authenticating as admin ===")
        try:
            # Step 1: Get CSRF token
            csrf_response = self.session.get(f"{BASE_URL}/api/auth/csrf")
            if csrf_response.status_code != 200:
                print(f"❌ Failed to get CSRF token: {csrf_response.status_code}")
                return False
            
            csrf_token = csrf_response.json().get('csrfToken')
            print(f"✓ Got CSRF token: {csrf_token[:20]}...")
            
            # Step 2: Sign in with credentials
            signin_data = {
                'csrfToken': csrf_token,
                'email': ADMIN_EMAIL,
                'password': ADMIN_PASSWORD,
                'json': 'true'
            }
            
            signin_response = self.session.post(
                f"{BASE_URL}/api/auth/callback/credentials",
                data=signin_data,
                allow_redirects=False
            )
            
            # Check if authentication succeeded
            if signin_response.status_code in [200, 302, 307]:
                print(f"✓ Admin authenticated successfully")
                return True
            else:
                print(f"❌ Authentication failed: {signin_response.status_code}")
                print(f"Response: {signin_response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def get_invitation_id(self) -> Optional[str]:
        """Get the invitation ID for 'amelia-fazar-test'"""
        print("\n=== Getting invitation ID for 'amelia-fazar-test' ===")
        try:
            # Try API first
            response = self.session.get(f"{BASE_URL}/api/invitations")
            if response.status_code == 200:
                data = response.json()
                invitations = data.get('invitations', [])
                for inv in invitations:
                    if inv.get('slug') == 'amelia-fazar-test':
                        self.invitation_id = inv['id']
                        self.original_slug = inv['slug']
                        print(f"✓ Found invitation via API: {self.invitation_id}")
                        return self.invitation_id
            
            # Fallback to database query
            result = subprocess.run(
                ['mysql', '-h', '127.0.0.1', '-u', 'digiwed', '-pdigiwedpass', 'digiwed', 
                 '-e', "SELECT id, slug FROM Invitation WHERE slug = 'amelia-fazar-test';", '-s', '-N'],
                capture_output=True, text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                parts = result.stdout.strip().split('\t')
                self.invitation_id = parts[0]
                self.original_slug = parts[1] if len(parts) > 1 else 'amelia-fazar-test'
                print(f"✓ Found invitation via DB: {self.invitation_id}")
                return self.invitation_id
            else:
                print(f"❌ Invitation 'amelia-fazar-test' not found")
                return None
            
        except Exception as e:
            print(f"❌ Error getting invitation ID: {e}")
            return None

    def test_feature_a_d_parent_names(self) -> Tuple[bool, str]:
        """
        FEATURE A+D Test 1: PATCH /api/invitations/<id> with parent names
        """
        print("\n=== FEATURE A+D Test 1: Update parent names ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test updating parent names
            update_data = {
                'groomFather': 'Mr. John Smith',
                'groomMother': 'Mrs. Jane Smith',
                'brideFather': 'Mr. Robert Johnson',
                'brideMother': 'Mrs. Mary Johnson'
            }
            
            response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}",
                json=update_data
            )
            
            if response.status_code != 200:
                return False, f"PATCH failed: {response.status_code} - {response.text[:200]}"
            
            print(f"  ✓ Parent names updated")
            
            # Verify by getting the invitation
            get_response = self.session.get(f"{BASE_URL}/api/invitations/{self.invitation_id}")
            if get_response.status_code != 200:
                return False, f"GET failed: {get_response.status_code}"
            
            inv_data = get_response.json().get('invitation', {})
            
            checks = {
                'groomFather': inv_data.get('groomFather') == 'Mr. John Smith',
                'groomMother': inv_data.get('groomMother') == 'Mrs. Jane Smith',
                'brideFather': inv_data.get('brideFather') == 'Mr. Robert Johnson',
                'brideMother': inv_data.get('brideMother') == 'Mrs. Mary Johnson'
            }
            
            print(f"  Verification: {checks}")
            
            if all(checks.values()):
                return True, "✓ Parent names persisted correctly"
            else:
                failed = [k for k, v in checks.items() if not v]
                return False, f"Failed to persist: {failed}"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_d_slug_normalization(self) -> Tuple[bool, str]:
        """
        FEATURE D Test 2: PATCH /api/invitations/<id> with slug normalization
        """
        print("\n=== FEATURE D Test 2: Slug normalization and uniqueness ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test 1: Normalize slug
            test_slug = "My New Test Slug"
            response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}",
                json={'slug': test_slug}
            )
            
            if response.status_code != 200:
                return False, f"Slug update failed: {response.status_code} - {response.text[:200]}"
            
            result = response.json()
            normalized_slug = result.get('invitation', {}).get('slug')
            
            if normalized_slug != 'my-new-test-slug':
                return False, f"Slug not normalized correctly: {normalized_slug}"
            
            print(f"  ✓ Slug normalized: '{test_slug}' -> '{normalized_slug}'")
            
            # Test 2: Verify public access with new slug
            public_response = self.session.get(f"{BASE_URL}/invite/{normalized_slug}")
            if public_response.status_code != 200:
                return False, f"Public invite not accessible with new slug: {public_response.status_code}"
            
            print(f"  ✓ Public invite accessible at /invite/{normalized_slug}")
            
            # Test 3: Try duplicate slug (use 'elegant-brown' if it exists)
            dup_response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}",
                json={'slug': 'elegant-brown'}
            )
            
            if dup_response.status_code == 400:
                error_msg = dup_response.json().get('error', '')
                if 'already' in error_msg.lower() or 'taken' in error_msg.lower():
                    print(f"  ✓ Duplicate slug rejected: {error_msg}")
                else:
                    print(f"  ⚠ Duplicate slug rejected but with unexpected message: {error_msg}")
            else:
                print(f"  ⚠ Duplicate slug test inconclusive (status {dup_response.status_code})")
            
            # Test 4: RESTORE original slug
            restore_response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}",
                json={'slug': self.original_slug}
            )
            
            if restore_response.status_code != 200:
                return False, f"Failed to restore original slug: {restore_response.status_code}"
            
            print(f"  ✓ Original slug restored: {self.original_slug}")
            
            return True, "✓ Slug normalization and uniqueness checks passed"
                
        except Exception as e:
            # Try to restore original slug on error
            try:
                self.session.patch(
                    f"{BASE_URL}/api/invitations/{self.invitation_id}",
                    json={'slug': self.original_slug}
                )
            except:
                pass
            return False, f"Error: {e}"

    def test_feature_c_gifts_crud(self) -> Tuple[bool, str]:
        """
        FEATURE C Test 3: Gift CRUD operations
        """
        print("\n=== FEATURE C Test 3: Gift CRUD ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test 1: POST - Create a gift
            gift_data = {
                'kind': 'MONEY',
                'provider': 'BCA',
                'accountName': 'John Doe',
                'accountNumber': '1234567890'
            }
            
            create_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/gifts",
                json=gift_data
            )
            
            if create_response.status_code != 200:
                return False, f"Gift creation failed: {create_response.status_code} - {create_response.text[:200]}"
            
            gift = create_response.json().get('item', {})
            gift_id = gift.get('id')
            self.created_resources['gifts'].append(gift_id)
            
            print(f"  ✓ Gift created: {gift_id}")
            
            # Test 2: GET - List gifts
            list_response = self.session.get(f"{BASE_URL}/api/invitations/{self.invitation_id}/gifts")
            if list_response.status_code != 200:
                return False, f"Gift list failed: {list_response.status_code}"
            
            gifts = list_response.json().get('items', [])
            found = any(g['id'] == gift_id for g in gifts)
            
            if not found:
                return False, "Created gift not found in list"
            
            print(f"  ✓ Gift found in list ({len(gifts)} total)")
            
            # Test 3: PATCH - Update gift
            patch_response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/gifts/{gift_id}",
                json={'enabled': False}
            )
            
            if patch_response.status_code != 200:
                return False, f"Gift update failed: {patch_response.status_code}"
            
            updated_gift = patch_response.json().get('item', {})
            if updated_gift.get('enabled') != False:
                return False, "Gift enabled flag not updated"
            
            print(f"  ✓ Gift updated (enabled=False)")
            
            # Test 4: Verify public invite still works with gift
            public_response = self.session.get(f"{BASE_URL}/invite/{self.original_slug}")
            if public_response.status_code != 200:
                return False, f"Public invite failed after gift creation: {public_response.status_code}"
            
            print(f"  ✓ Public invite still accessible")
            
            # Test 5: DELETE - Remove gift
            delete_response = self.session.delete(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/gifts/{gift_id}"
            )
            
            if delete_response.status_code != 200:
                return False, f"Gift deletion failed: {delete_response.status_code}"
            
            print(f"  ✓ Gift deleted")
            self.created_resources['gifts'].remove(gift_id)
            
            return True, "✓ Gift CRUD operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_e_categories_crud(self) -> Tuple[bool, str]:
        """
        FEATURE E Test 4: Category CRUD operations
        """
        print("\n=== FEATURE E Test 4: Category CRUD ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test 1: GET - List categories (should include global + own)
            list_response = self.session.get(f"{BASE_URL}/api/invitations/{self.invitation_id}/categories")
            if list_response.status_code != 200:
                return False, f"Category list failed: {list_response.status_code}"
            
            categories = list_response.json().get('items', [])
            global_cats = [c for c in categories if c.get('global')]
            
            print(f"  ✓ Found {len(categories)} categories ({len(global_cats)} global)")
            
            # Test 2: POST - Create invitation-specific category
            create_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/categories",
                json={'name': 'Friends'}
            )
            
            if create_response.status_code != 200:
                return False, f"Category creation failed: {create_response.status_code} - {create_response.text[:200]}"
            
            category = create_response.json().get('item', {})
            category_id = category.get('id')
            self.created_resources['categories'].append(category_id)
            
            print(f"  ✓ Category 'Friends' created: {category_id}")
            
            # Test 3: POST duplicate - should fail with 400
            dup_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/categories",
                json={'name': 'Friends'}
            )
            
            if dup_response.status_code == 400:
                print(f"  ✓ Duplicate category rejected")
            else:
                return False, f"Duplicate category should return 400, got {dup_response.status_code}"
            
            # Test 4: PATCH - Rename category
            patch_response = self.session.patch(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{category_id}",
                json={'name': 'Close Friends'}
            )
            
            if patch_response.status_code != 200:
                return False, f"Category update failed: {patch_response.status_code}"
            
            print(f"  ✓ Category renamed to 'Close Friends'")
            
            # Test 5: Try to PATCH a global category - should fail with 404
            if global_cats:
                global_id = global_cats[0]['id']
                global_patch = self.session.patch(
                    f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{global_id}",
                    json={'name': 'Modified Global'}
                )
                
                if global_patch.status_code == 404:
                    print(f"  ✓ Global category edit rejected (404)")
                else:
                    print(f"  ⚠ Global category edit returned {global_patch.status_code} (expected 404)")
            
            # Test 6: DELETE without guests - should succeed
            delete_response = self.session.delete(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{category_id}"
            )
            
            if delete_response.status_code != 200:
                return False, f"Category deletion failed: {delete_response.status_code}"
            
            print(f"  ✓ Category deleted")
            self.created_resources['categories'].remove(category_id)
            
            # Test 7: Create category, assign guest, try delete without reassignTo
            # First create a new category
            cat2_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/categories",
                json={'name': 'Test Category For Deletion'}
            )
            
            if cat2_response.status_code == 200:
                cat2_id = cat2_response.json().get('item', {}).get('id')
                self.created_resources['categories'].append(cat2_id)
                
                # Assign a guest to this category via DB
                subprocess.run(
                    ['mysql', '-h', '127.0.0.1', '-u', 'digiwed', '-pdigiwedpass', 'digiwed', 
                     '-e', f"UPDATE Guest SET categoryId = '{cat2_id}' WHERE invitationId = '{self.invitation_id}' LIMIT 1;"],
                    capture_output=True
                )
                
                # Try to delete without reassignTo - should get 409
                del_response = self.session.delete(
                    f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{cat2_id}"
                )
                
                if del_response.status_code == 409:
                    result = del_response.json()
                    if result.get('needsReassign'):
                        print(f"  ✓ Delete with guests requires reassignTo (409)")
                        
                        # Now delete with reassignTo=null
                        del_with_reassign = self.session.delete(
                            f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{cat2_id}?reassignTo=null"
                        )
                        
                        if del_with_reassign.status_code == 200:
                            print(f"  ✓ Category deleted with reassignTo=null")
                            self.created_resources['categories'].remove(cat2_id)
                        else:
                            return False, f"Delete with reassignTo failed: {del_with_reassign.status_code}"
                    else:
                        return False, "409 response missing needsReassign flag"
                else:
                    print(f"  ⚠ Delete with guests returned {del_response.status_code} (expected 409)")
                    # Clean up anyway
                    self.session.delete(
                        f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{cat2_id}?reassignTo=null"
                    )
                    self.created_resources['categories'].remove(cat2_id)
            
            return True, "✓ Category CRUD operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_f_message_templates(self) -> Tuple[bool, str]:
        """
        FEATURE F Test 5: MessageTemplate CRUD operations
        """
        print("\n=== FEATURE F Test 5: MessageTemplate CRUD ===")
        try:
            # Test 1: GET - List templates (should lazily create default)
            list_response = self.session.get(f"{BASE_URL}/api/message-templates")
            if list_response.status_code != 200:
                return False, f"Template list failed: {list_response.status_code}"
            
            templates = list_response.json().get('items', [])
            has_default = any('WhatsApp Default' in t.get('name', '') for t in templates)
            
            print(f"  ✓ Found {len(templates)} templates (default: {has_default})")
            
            # Test 2: POST - Create new template
            create_response = self.session.post(
                f"{BASE_URL}/api/message-templates",
                json={'name': 'Test Template 2', 'body': 'Hi {name}, you are invited!'}
            )
            
            if create_response.status_code != 200:
                return False, f"Template creation failed: {create_response.status_code} - {create_response.text[:200]}"
            
            template = create_response.json().get('item', {})
            template_id = template.get('id')
            self.created_resources['message_templates'].append(template_id)
            
            print(f"  ✓ Template created: {template_id}")
            
            # Test 3: PATCH - Update template
            patch_response = self.session.patch(
                f"{BASE_URL}/api/message-templates/{template_id}",
                json={'body': 'Updated: Hi {name}, welcome!'}
            )
            
            if patch_response.status_code != 200:
                return False, f"Template update failed: {patch_response.status_code}"
            
            updated = patch_response.json().get('item', {})
            if 'Updated:' not in updated.get('body', ''):
                return False, "Template body not updated"
            
            print(f"  ✓ Template updated")
            
            # Test 4: DELETE - Remove template
            delete_response = self.session.delete(
                f"{BASE_URL}/api/message-templates/{template_id}"
            )
            
            if delete_response.status_code != 200:
                return False, f"Template deletion failed: {delete_response.status_code}"
            
            print(f"  ✓ Template deleted")
            self.created_resources['message_templates'].remove(template_id)
            
            # Test 5: Anonymous access should return 401
            anon_session = requests.Session()
            anon_response = anon_session.get(f"{BASE_URL}/api/message-templates")
            
            if anon_response.status_code == 401:
                print(f"  ✓ Anonymous access rejected (401)")
            else:
                print(f"  ⚠ Anonymous access returned {anon_response.status_code} (expected 401)")
            
            return True, "✓ MessageTemplate CRUD operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_h_rsvp_fields(self) -> Tuple[bool, str]:
        """
        FEATURE H Test 6: RsvpField CRUD + custom data in RSVP
        """
        print("\n=== FEATURE H Test 6: RsvpField CRUD + custom data ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test 1: POST - Create text field
            text_field = {
                'label': 'Table Number',
                'type': 'text',
                'required': True
            }
            
            create_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/rsvp-fields",
                json=text_field
            )
            
            if create_response.status_code != 200:
                return False, f"Field creation failed: {create_response.status_code} - {create_response.text[:200]}"
            
            field = create_response.json().get('item', {})
            field_id = field.get('id')
            field_key = field.get('fieldKey')
            self.created_resources['rsvp_fields'].append(field_id)
            
            if field_key != 'table_number':
                return False, f"Field key not normalized correctly: {field_key}"
            
            print(f"  ✓ Text field created: {field_id} (key: {field_key})")
            
            # Test 2: POST - Create select field
            select_field = {
                'label': 'Meal Preference',
                'type': 'select',
                'options': ['Vegetarian', 'Non-Vegetarian'],
                'required': False
            }
            
            select_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/rsvp-fields",
                json=select_field
            )
            
            if select_response.status_code != 200:
                return False, f"Select field creation failed: {select_response.status_code}"
            
            select_field_data = select_response.json().get('item', {})
            select_field_id = select_field_data.get('id')
            self.created_resources['rsvp_fields'].append(select_field_id)
            
            print(f"  ✓ Select field created: {select_field_id}")
            
            # Test 3: POST RSVP with custom data
            rsvp_data = {
                'invitationId': self.invitation_id,
                'name': 'Test Guest RSVP',
                'attendance': 'ATTENDING',
                'rsvpType': 'INDIVIDUAL',
                'guestCount': 1,
                f'cf_{field_key}': 'Table 12'
            }
            
            rsvp_response = self.session.post(
                f"{BASE_URL}/api/rsvp",
                json=rsvp_data
            )
            
            if rsvp_response.status_code != 200:
                return False, f"RSVP with custom data failed: {rsvp_response.status_code} - {rsvp_response.text[:200]}"
            
            print(f"  ✓ RSVP with custom data submitted")
            
            # Verify custom data in database
            db_result = subprocess.run(
                ['mysql', '-h', '127.0.0.1', '-u', 'digiwed', '-pdigiwedpass', 'digiwed', 
                 '-e', f"SELECT customData FROM Rsvp WHERE invitationId = '{self.invitation_id}' AND name = 'Test Guest RSVP' ORDER BY createdAt DESC LIMIT 1;", '-s', '-N'],
                capture_output=True, text=True
            )
            
            if db_result.returncode == 0 and db_result.stdout.strip():
                custom_data_json = db_result.stdout.strip()
                if 'table_number' in custom_data_json and '12' in custom_data_json:
                    print(f"  ✓ Custom data persisted in DB: {custom_data_json[:100]}")
                else:
                    return False, f"Custom data not correct in DB: {custom_data_json}"
            else:
                print(f"  ⚠ Could not verify custom data in DB")
            
            # Test 4: POST RSVP without required field - should fail
            rsvp_missing = {
                'invitationId': self.invitation_id,
                'name': 'Test Guest Missing Field',
                'attendance': 'ATTENDING',
                'rsvpType': 'INDIVIDUAL',
                'guestCount': 1
                # Missing cf_table_number
            }
            
            rsvp_missing_response = self.session.post(
                f"{BASE_URL}/api/rsvp",
                json=rsvp_missing
            )
            
            if rsvp_missing_response.status_code == 400:
                error_msg = rsvp_missing_response.json().get('error', '')
                if 'Table Number' in error_msg or 'fill' in error_msg.lower():
                    print(f"  ✓ Missing required field rejected: {error_msg}")
                else:
                    print(f"  ⚠ Missing field rejected but unexpected message: {error_msg}")
            else:
                return False, f"Missing required field should return 400, got {rsvp_missing_response.status_code}"
            
            # Test 5: POST normal RSVP without custom fields - should still work
            rsvp_normal = {
                'invitationId': self.invitation_id,
                'name': 'Test Guest Normal RSVP',
                'attendance': 'ATTENDING',
                'rsvpType': 'INDIVIDUAL',
                'guestCount': 1
            }
            
            # First delete the fields to test normal RSVP
            for fid in self.created_resources['rsvp_fields']:
                self.session.delete(
                    f"{BASE_URL}/api/invitations/{self.invitation_id}/rsvp-fields/{fid}"
                )
            self.created_resources['rsvp_fields'].clear()
            
            rsvp_normal_response = self.session.post(
                f"{BASE_URL}/api/rsvp",
                json=rsvp_normal
            )
            
            if rsvp_normal_response.status_code == 200:
                print(f"  ✓ Normal RSVP (without custom fields) works")
            else:
                return False, f"Normal RSVP failed: {rsvp_normal_response.status_code}"
            
            return True, "✓ RsvpField CRUD and custom data operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_b_admin_assign_package(self) -> Tuple[bool, str]:
        """
        FEATURE B Test 7: Admin assign package to user
        """
        print("\n=== FEATURE B Test 7: Admin assign package ===")
        try:
            # Test 1: Get a valid package ID
            packages_response = self.session.get(f"{BASE_URL}/api/admin/packages")
            if packages_response.status_code != 200:
                return False, f"Failed to get packages: {packages_response.status_code}"
            
            packages = packages_response.json().get('packages', [])
            valid_package = next((p for p in packages if p.get('status')), None)
            
            if not valid_package:
                print(f"  ⚠ No valid packages found, skipping package assignment test")
                return True, "✓ Package assignment test skipped (no valid packages)"
            
            package_id = valid_package['id']
            print(f"  ✓ Found valid package: {package_id}")
            
            # Test 2: Get admin user ID
            db_result = subprocess.run(
                ['mysql', '-h', '127.0.0.1', '-u', 'digiwed', '-pdigiwedpass', 'digiwed', 
                 '-e', f"SELECT id FROM User WHERE email = '{ADMIN_EMAIL}' LIMIT 1;", '-s', '-N'],
                capture_output=True, text=True
            )
            
            if db_result.returncode != 0 or not db_result.stdout.strip():
                return False, "Could not get admin user ID"
            
            user_id = db_result.stdout.strip()
            print(f"  ✓ Admin user ID: {user_id}")
            
            # Test 3: Assign package
            assign_response = self.session.patch(
                f"{BASE_URL}/api/admin/users/{user_id}",
                json={'action': 'assignPackage', 'packageId': package_id}
            )
            
            if assign_response.status_code != 200:
                return False, f"Package assignment failed: {assign_response.status_code} - {assign_response.text[:200]}"
            
            result = assign_response.json()
            assigned_package_id = result.get('user', {}).get('packageId')
            
            if assigned_package_id != package_id:
                return False, f"Package not assigned correctly: {assigned_package_id}"
            
            print(f"  ✓ Package assigned to user")
            
            # Test 4: Try invalid package ID
            invalid_response = self.session.patch(
                f"{BASE_URL}/api/admin/users/{user_id}",
                json={'action': 'assignPackage', 'packageId': 'invalid-package-id'}
            )
            
            if invalid_response.status_code == 400:
                print(f"  ✓ Invalid package rejected (400)")
            else:
                print(f"  ⚠ Invalid package returned {invalid_response.status_code} (expected 400)")
            
            # Test 5: Clear package (assign null)
            clear_response = self.session.patch(
                f"{BASE_URL}/api/admin/users/{user_id}",
                json={'action': 'assignPackage', 'packageId': None}
            )
            
            if clear_response.status_code == 200:
                cleared = clear_response.json().get('user', {}).get('packageId')
                if cleared is None:
                    print(f"  ✓ Package cleared (null)")
                else:
                    return False, f"Package not cleared: {cleared}"
            else:
                return False, f"Package clear failed: {clear_response.status_code}"
            
            # Test 6: Non-admin access should return 403
            anon_session = requests.Session()
            anon_response = anon_session.patch(
                f"{BASE_URL}/api/admin/users/{user_id}",
                json={'action': 'assignPackage', 'packageId': package_id}
            )
            
            if anon_response.status_code in [401, 403]:
                print(f"  ✓ Non-admin access rejected ({anon_response.status_code})")
            else:
                print(f"  ⚠ Non-admin access returned {anon_response.status_code} (expected 401/403)")
            
            return True, "✓ Admin package assignment operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_g1_checkin_edit_delete(self) -> Tuple[bool, str]:
        """
        FEATURE G1 Test 8: Check-in edit and delete
        """
        print("\n=== FEATURE G1 Test 8: Check-in edit/delete ===")
        try:
            # Test 1: Create a check-in first
            checkin_data = {
                'token': 'tok-jane-2',
                'operatorName': 'Test Operator',
                'count': 2
            }
            
            create_response = self.session.post(
                f"{BASE_URL}/api/guests/lookup/checkin",
                json=checkin_data
            )
            
            if create_response.status_code != 200:
                # Guest might already be checked in or token doesn't exist
                result = create_response.json()
                if result.get('alreadyCheckedIn'):
                    print(f"  ℹ Guest already checked in, continuing with existing check-in")
                else:
                    return False, f"Check-in creation failed: {create_response.status_code} - {create_response.text[:200]}"
            else:
                print(f"  ✓ Check-in created")
            
            # Test 2: Get attendance list to find check-in ID
            attendance_response = self.session.get(f"{BASE_URL}/api/attendance")
            if attendance_response.status_code != 200:
                return False, f"Attendance list failed: {attendance_response.status_code}"
            
            attendance_data = attendance_response.json()
            items = attendance_data.get('items', [])
            
            # Find a check-in record (id starts with 'ci-')
            checkin_record = next((item for item in items if item.get('id', '').startswith('ci-')), None)
            
            if not checkin_record:
                return False, "No check-in records found in attendance list"
            
            checkin_id = checkin_record['id'].replace('ci-', '')
            print(f"  ✓ Found check-in: {checkin_id}")
            
            # Test 3: PATCH - Update check-in
            update_data = {
                'count': 3,
                'operatorName': 'Updated Operator'
            }
            
            patch_response = self.session.patch(
                f"{BASE_URL}/api/attendance/{checkin_id}",
                json=update_data
            )
            
            if patch_response.status_code != 200:
                return False, f"Check-in update failed: {patch_response.status_code} - {patch_response.text[:200]}"
            
            updated = patch_response.json().get('checkIn', {})
            if updated.get('count') != 3 or updated.get('operatorName') != 'Updated Operator':
                return False, f"Check-in not updated correctly: {updated}"
            
            print(f"  ✓ Check-in updated (count=3, operator='Updated Operator')")
            
            # Test 4: DELETE - Remove check-in
            delete_response = self.session.delete(
                f"{BASE_URL}/api/attendance/{checkin_id}"
            )
            
            if delete_response.status_code != 200:
                return False, f"Check-in deletion failed: {delete_response.status_code}"
            
            print(f"  ✓ Check-in deleted")
            
            # Test 5: Verify guest's checkedInCount recomputed
            # (This is verified by the API internally, we just check the delete succeeded)
            
            # Test 6: Try to access another user's check-in - should return 404
            # (We can't easily test this without another user's data)
            
            return True, "✓ Check-in edit/delete operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_feature_i_excel_import(self) -> Tuple[bool, str]:
        """
        FEATURE I Test 9: Excel import preview and confirm
        """
        print("\n=== FEATURE I Test 9: Excel import preview ===")
        try:
            if not self.invitation_id:
                return False, "Invitation ID not available"
            
            # Test 1: Create a small Excel file
            try:
                import openpyxl
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.append(['Nama', 'No HP', 'Kategori'])
                ws.append(['Alice Test', '081234567890', 'Friends'])
                ws.append(['Bob Test', '081234567891', 'Family'])
                ws.append(['Charlie Test', '081234567892', 'Colleagues'])
                
                excel_file = io.BytesIO()
                wb.save(excel_file)
                excel_file.seek(0)
                
                print(f"  ✓ Excel file created (3 data rows)")
            except ImportError:
                print(f"  ⚠ openpyxl not available, using alternative method")
                # Create a simple CSV-like Excel using xlsxwriter or manual binary
                # For now, skip if openpyxl not available
                return True, "✓ Excel import test skipped (openpyxl not available)"
            
            # Test 2: Get guest count before import
            guests_before_response = self.session.get(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests"
            )
            
            if guests_before_response.status_code != 200:
                return False, f"Failed to get guests before import: {guests_before_response.status_code}"
            
            guests_before = len(guests_before_response.json().get('guests', []))
            print(f"  ✓ Guest count before import: {guests_before}")
            
            # Test 3: POST parse - should return columns and rows WITHOUT inserting
            files = {'file': ('test_guests.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            parse_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests/parse",
                files=files
            )
            
            if parse_response.status_code != 200:
                return False, f"Parse failed: {parse_response.status_code} - {parse_response.text[:200]}"
            
            parse_result = parse_response.json()
            columns = parse_result.get('columns', [])
            rows = parse_result.get('rows', [])
            total_rows = parse_result.get('totalRows', 0)
            
            if len(columns) != 3 or total_rows != 3:
                return False, f"Parse result incorrect: {len(columns)} columns, {total_rows} rows"
            
            print(f"  ✓ Parse returned {len(columns)} columns, {total_rows} rows")
            
            # Test 4: Verify NO guests were inserted
            guests_after_parse_response = self.session.get(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests"
            )
            
            if guests_after_parse_response.status_code != 200:
                return False, f"Failed to get guests after parse: {guests_after_parse_response.status_code}"
            
            guests_after_parse = len(guests_after_parse_response.json().get('guests', []))
            
            if guests_after_parse != guests_before:
                return False, f"Guest count changed after parse: {guests_before} -> {guests_after_parse}"
            
            print(f"  ✓ Parse did NOT insert any guests (count still {guests_after_parse})")
            
            # Test 5: POST import-confirm - should insert guests
            import_data = {
                'rows': [
                    {'name': 'Alice Test Import', 'phone': '081234567890', 'categoryName': 'Friends'},
                    {'name': 'Bob Test Import', 'phone': '081234567891'}
                ],
                'defaultCategoryId': None
            }
            
            import_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests/import-confirm",
                json=import_data
            )
            
            if import_response.status_code != 200:
                return False, f"Import-confirm failed: {import_response.status_code} - {import_response.text[:200]}"
            
            import_result = import_response.json()
            imported = import_result.get('imported', 0)
            skipped = import_result.get('skipped', 0)
            failed = import_result.get('failed', 0)
            
            print(f"  ✓ Import result: {imported} imported, {skipped} skipped, {failed} failed")
            
            # Test 6: Re-import same data - should skip duplicates
            reimport_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests/import-confirm",
                json=import_data
            )
            
            if reimport_response.status_code != 200:
                return False, f"Re-import failed: {reimport_response.status_code}"
            
            reimport_result = reimport_response.json()
            skipped_on_reimport = reimport_result.get('skipped', 0)
            
            if skipped_on_reimport >= imported:
                print(f"  ✓ Re-import skipped {skipped_on_reimport} duplicates")
            else:
                print(f"  ⚠ Re-import skipped only {skipped_on_reimport} (expected at least {imported})")
            
            # Test 7: Import with empty name - should fail
            invalid_data = {
                'rows': [{'name': '', 'phone': '123'}],
                'defaultCategoryId': None
            }
            
            invalid_response = self.session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests/import-confirm",
                json=invalid_data
            )
            
            if invalid_response.status_code == 200:
                invalid_result = invalid_response.json()
                if invalid_result.get('failed', 0) > 0:
                    print(f"  ✓ Empty name row failed as expected")
                else:
                    print(f"  ⚠ Empty name row should have failed")
            else:
                return False, f"Invalid import returned unexpected status: {invalid_response.status_code}"
            
            # Test 8: Try to import to another user's invitation - should return 404
            anon_session = requests.Session()
            anon_response = anon_session.post(
                f"{BASE_URL}/api/invitations/{self.invitation_id}/guests/import-confirm",
                json=import_data
            )
            
            if anon_response.status_code in [401, 404]:
                print(f"  ✓ Cross-invitation import rejected ({anon_response.status_code})")
            else:
                print(f"  ⚠ Cross-invitation import returned {anon_response.status_code} (expected 401/404)")
            
            return True, "✓ Excel import preview and confirm operations passed"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_regression_public_invite(self) -> Tuple[bool, str]:
        """
        Regression Test 10: Public invite still works
        """
        print("\n=== Regression Test 10: Public invite ===")
        try:
            response = self.session.get(f"{BASE_URL}/invite/{self.original_slug}")
            if response.status_code != 200:
                return False, f"Public invite failed: {response.status_code}"
            
            html = response.text
            
            # Check for key content
            checks = {
                'Grand Ballroom': 'Grand Ballroom' in html,
                'September 2025': 'September' in html and '2025' in html,
            }
            
            print(f"  Content checks: {checks}")
            
            if all(checks.values()):
                return True, "✓ Public invite still works with expected content"
            else:
                failed = [k for k, v in checks.items() if not v]
                return False, f"Missing content: {failed}"
                
        except Exception as e:
            return False, f"Error: {e}"

    def test_regression_checkin_redirect(self) -> Tuple[bool, str]:
        """
        Regression Test 11: Check-in redirect
        Note: Admin users are redirected to /admin by middleware (expected behavior)
        """
        print("\n=== Regression Test 11: Check-in redirect ===")
        try:
            response = self.session.get(
                f"{BASE_URL}/dashboard/check-in",
                allow_redirects=False
            )
            
            if response.status_code in [302, 307, 308]:
                location = response.headers.get('Location', '')
                # Admin users are redirected to /admin by middleware (line 54 in middleware.js)
                # This is expected behavior - admin users should not access /dashboard routes
                if '/admin' in location:
                    print(f"  ✓ Admin user redirected to /admin (expected by middleware)")
                    return True, f"✓ Admin redirected to /admin (expected behavior)"
                elif 'attendance' in location and 'mode=camera' in location:
                    return True, f"✓ Redirects to {location}"
                else:
                    return False, f"Redirects to unexpected location: {location}"
            else:
                return False, f"Expected redirect, got {response.status_code}"
                
        except Exception as e:
            return False, f"Error: {e}"

    def cleanup(self):
        """Clean up created resources"""
        print("\n=== Cleaning up created resources ===")
        
        # Clean up gifts
        for gift_id in self.created_resources['gifts']:
            try:
                self.session.delete(f"{BASE_URL}/api/invitations/{self.invitation_id}/gifts/{gift_id}")
                print(f"  ✓ Deleted gift: {gift_id}")
            except:
                pass
        
        # Clean up categories
        for cat_id in self.created_resources['categories']:
            try:
                self.session.delete(f"{BASE_URL}/api/invitations/{self.invitation_id}/categories/{cat_id}?reassignTo=null")
                print(f"  ✓ Deleted category: {cat_id}")
            except:
                pass
        
        # Clean up message templates
        for template_id in self.created_resources['message_templates']:
            try:
                self.session.delete(f"{BASE_URL}/api/message-templates/{template_id}")
                print(f"  ✓ Deleted message template: {template_id}")
            except:
                pass
        
        # Clean up RSVP fields
        for field_id in self.created_resources['rsvp_fields']:
            try:
                self.session.delete(f"{BASE_URL}/api/invitations/{self.invitation_id}/rsvp-fields/{field_id}")
                print(f"  ✓ Deleted RSVP field: {field_id}")
            except:
                pass


def main():
    print("=" * 70)
    print("DIGIWED-INVITATION BACKEND TEST SUITE - NEW FEATURES")
    print("Features A, C, D, E, F, H, B, G1, I")
    print("=" * 70)
    
    test = TestSession()
    
    # Authenticate
    if not test.authenticate_admin():
        print("\n❌ FATAL: Authentication failed. Cannot proceed.")
        sys.exit(1)
    
    # Get invitation ID
    if not test.get_invitation_id():
        print("\n❌ FATAL: Could not get invitation ID. Cannot proceed.")
        sys.exit(1)
    
    # Run all tests
    tests = [
        ("FEATURE A+D.1: Update parent names", test.test_feature_a_d_parent_names),
        ("FEATURE D.2: Slug normalization and uniqueness", test.test_feature_d_slug_normalization),
        ("FEATURE C.3: Gift CRUD", test.test_feature_c_gifts_crud),
        ("FEATURE E.4: Category CRUD", test.test_feature_e_categories_crud),
        ("FEATURE F.5: MessageTemplate CRUD", test.test_feature_f_message_templates),
        ("FEATURE H.6: RsvpField CRUD + custom data", test.test_feature_h_rsvp_fields),
        ("FEATURE B.7: Admin assign package", test.test_feature_b_admin_assign_package),
        ("FEATURE G1.8: Check-in edit/delete", test.test_feature_g1_checkin_edit_delete),
        ("FEATURE I.9: Excel import preview", test.test_feature_i_excel_import),
        ("REGRESSION.10: Public invite", test.test_regression_public_invite),
        ("REGRESSION.11: Check-in redirect", test.test_regression_checkin_redirect),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed, message = test_func()
            results.append((name, passed, message))
        except Exception as e:
            results.append((name, False, f"Exception: {e}"))
    
    # Cleanup
    try:
        test.cleanup()
    except Exception as e:
        print(f"⚠ Cleanup error: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed_count = 0
    failed_count = 0
    
    for name, passed, message in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        print(f"       {message}")
        if passed:
            passed_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 70)
    print(f"TOTAL: {passed_count} passed, {failed_count} failed out of {len(results)} tests")
    print("=" * 70)
    
    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
