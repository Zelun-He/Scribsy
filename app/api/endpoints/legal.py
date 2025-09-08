"""
Legal and compliance endpoints for HIPAA privacy policies and terms
"""
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from app.config import settings

router = APIRouter(prefix="/legal", tags=["legal"])

@router.get("/privacy-policy", response_class=HTMLResponse)
def get_privacy_policy():
    """Get HIPAA-compliant privacy policy"""
    
    privacy_policy = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scribsy - HIPAA Privacy Policy</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1, h2 { color: #2c3e50; }
            .effective-date { color: #666; font-style: italic; }
            .section { margin: 20px 0; }
            .highlight { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; }
        </style>
    </head>
    <body>
        <h1>Scribsy HIPAA Privacy Policy</h1>
        <p class="effective-date">Effective Date: September 2025</p>
        
        <div class="section">
            <h2>1. About This Notice</h2>
            <p>This Notice of Privacy Practices describes how Scribsy may use and disclose your Protected Health Information (PHI) to carry out treatment, payment, or healthcare operations, and for other purposes that are permitted or required by law. It also describes your rights to access and control your PHI.</p>
        </div>

        <div class="section highlight">
            <h2>2. Our Commitment to Your Privacy</h2>
            <p>Scribsy is committed to protecting the privacy and security of your health information. We are required by law to:</p>
            <ul>
                <li>Maintain the privacy of your PHI</li>
                <li>Provide you with this notice of our legal duties and privacy practices</li>
                <li>Follow the terms of this notice currently in effect</li>
                <li>Notify you if we are unable to agree to a requested restriction</li>
                <li>Accommodate reasonable requests you may have to communicate health information by alternative means or locations</li>
            </ul>
        </div>

        <div class="section">
            <h2>3. How We May Use and Disclose Your Health Information</h2>
            
            <h3>Treatment</h3>
            <p>We may use your health information to provide, coordinate, or manage your health care and any related services. This includes coordination or management of your health care with other healthcare providers.</p>
            
            <h3>Payment</h3>
            <p>We may use and disclose your health information to obtain payment for services we provide to you. This may include billing activities, claims management, and medical necessity determinations.</p>
            
            <h3>Healthcare Operations</h3>
            <p>We may use and disclose your health information for our healthcare operations, including quality assessment and improvement activities, reviewing competence of healthcare professionals, and conducting training programs.</p>
        </div>

        <div class="section">
            <h2>4. Your Individual Rights</h2>
            
            <h3>Right to Access Your PHI</h3>
            <p>You have the right to inspect and obtain copies of your health information that may be used to make decisions about you. To request access, contact us in writing.</p>
            
            <h3>Right to Amend</h3>
            <p>You have the right to request that we amend your health information if you feel it is incorrect or incomplete.</p>
            
            <h3>Right to an Accounting of Disclosures</h3>
            <p>You have the right to receive an accounting of certain disclosures we have made of your health information.</p>
            
            <h3>Right to Request Restrictions</h3>
            <p>You have the right to request restrictions on how we use or disclose your health information for treatment, payment, or healthcare operations.</p>
            
            <h3>Right to Request Confidential Communications</h3>
            <p>You have the right to request that we communicate with you about your health information in a certain way or at a certain location.</p>
        </div>

        <div class="section">
            <h2>5. Security Measures</h2>
            <p>We implement comprehensive security measures to protect your PHI:</p>
            <ul>
                <li><strong>Technical Safeguards:</strong> Encryption, access controls, audit logging, and session management</li>
                <li><strong>Administrative Safeguards:</strong> User training, role-based access controls, and regular security assessments</li>
                <li><strong>Physical Safeguards:</strong> Secure data storage and controlled facility access</li>
            </ul>
        </div>

        <div class="section">
            <h2>6. Data Retention and Disposal</h2>
            <p>We retain your health information in accordance with legal requirements and our data retention policies. PHI is securely disposed of after the required retention period using approved methods.</p>
        </div>

        <div class="section">
            <h2>7. Breach Notification</h2>
            <p>In the event of a breach of unsecured PHI, we will notify you within 60 days of discovery of the breach, as required by law.</p>
        </div>

        <div class="section">
            <h2>8. Complaints</h2>
            <p>If you believe your privacy rights have been violated, you may file a complaint with us or with the Secretary of the Department of Health and Human Services. All complaints must be submitted in writing. We will not retaliate against you for filing a complaint.</p>
        </div>

        <div class="section">
            <h2>9. Changes to This Notice</h2>
            <p>We reserve the right to change this notice and to make the revised or new notice provisions effective for PHI we already have about you as well as any information we receive in the future.</p>
        </div>

        <div class="section">
            <h2>10. Contact Information</h2>
            <p>For questions about this notice or to exercise your rights, please contact:</p>
            <p>
                <strong>Scribsy Privacy Officer</strong><br>
                Email: privacy@scribsy.com<br>
                Phone: [Phone Number]<br>
                Address: [Address]
            </p>
        </div>

        <div class="section highlight">
            <p><strong>Acknowledgment:</strong> By using the Scribsy system, you acknowledge that you have received and understand this Privacy Notice.</p>
        </div>
    </body>
    </html>
    """
    
    return privacy_policy

@router.get("/terms-of-service", response_class=HTMLResponse)
def get_terms_of_service():
    """Get terms of service"""
    
    terms = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scribsy - Terms of Service</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1, h2 { color: #2c3e50; }
            .effective-date { color: #666; font-style: italic; }
            .section { margin: 20px 0; }
            .highlight { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; }
        </style>
    </head>
    <body>
        <h1>Scribsy Terms of Service</h1>
        <p class="effective-date">Effective Date: September 2025</p>

        <div class="section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using Scribsy ("Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
        </div>

        <div class="section">
            <h2>2. Description of Service</h2>
            <p>Scribsy is a HIPAA-compliant electronic health record and medical transcription service designed for healthcare providers. The service includes patient management, note-taking, transcription, and related healthcare documentation features.</p>
        </div>

        <div class="section">
            <h2>3. HIPAA Compliance</h2>
            <p>Scribsy is designed to be compliant with the Health Insurance Portability and Accountability Act (HIPAA) and its implementing regulations. By using this service, you acknowledge that:</p>
            <ul>
                <li>You are a covered entity or business associate under HIPAA</li>
                <li>You will use the service in compliance with HIPAA requirements</li>
                <li>You understand your obligations regarding Protected Health Information (PHI)</li>
                <li>You will execute a Business Associate Agreement if required</li>
            </ul>
        </div>

        <div class="section">
            <h2>4. User Obligations</h2>
            <p>Users must:</p>
            <ul>
                <li>Maintain the confidentiality of login credentials</li>
                <li>Use the service only for authorized healthcare purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Report suspected security incidents immediately</li>
                <li>Log out of sessions when not in use</li>
                <li>Keep software and systems updated</li>
            </ul>
        </div>

        <div class="section">
            <h2>5. Data Security and Privacy</h2>
            <p>We implement comprehensive security measures including:</p>
            <ul>
                <li>End-to-end encryption of data in transit and at rest</li>
                <li>Regular security audits and monitoring</li>
                <li>Role-based access controls</li>
                <li>Audit logging of all PHI access</li>
                <li>Secure data backup and recovery procedures</li>
                <li>Incident response procedures</li>
            </ul>
        </div>

        <div class="section">
            <h2>6. Service Availability</h2>
            <p>While we strive to maintain 99.9% uptime, we do not guarantee uninterrupted service availability. Scheduled maintenance will be performed during off-peak hours with advance notice.</p>
        </div>

        <div class="section">
            <h2>7. Data Retention and Deletion</h2>
            <p>Data is retained according to our HIPAA-compliant retention policy:</p>
            <ul>
                <li>Patient records: Minimum 6 years, default 7 years</li>
                <li>Audit logs: 7 years</li>
                <li>User data: Deleted upon account termination plus legal hold period</li>
                <li>Secure deletion methods are used for all data disposal</li>
            </ul>
        </div>

        <div class="section">
            <h2>8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Scribsy shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
        </div>

        <div class="section">
            <h2>9. User Account Termination</h2>
            <p>We may terminate or suspend accounts for:</p>
            <ul>
                <li>Violation of these terms</li>
                <li>Suspected security breaches</li>
                <li>Non-payment of fees</li>
                <li>Compliance violations</li>
            </ul>
        </div>

        <div class="section">
            <h2>10. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Users will be notified of material changes via email and continued use of the service constitutes acceptance of the modified terms.</p>
        </div>

        <div class="section">
            <h2>11. Governing Law</h2>
            <p>These terms shall be governed by and construed in accordance with applicable federal and state laws, including HIPAA regulations.</p>
        </div>

        <div class="section">
            <h2>12. Contact Information</h2>
            <p>For questions regarding these terms, contact us at: legal@scribsy.com</p>
        </div>
    </body>
    </html>
    """
    
    return terms

@router.get("/business-associate-agreement", response_class=HTMLResponse)
def get_business_associate_agreement():
    """Get HIPAA Business Associate Agreement template"""
    
    baa = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scribsy - Business Associate Agreement</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
            h1, h2 { color: #2c3e50; }
            .effective-date { color: #666; font-style: italic; }
            .section { margin: 20px 0; }
            .highlight { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; }
        </style>
    </head>
    <body>
        <h1>Business Associate Agreement</h1>
        <p class="effective-date">Template for HIPAA Compliance</p>

        <div class="section highlight">
            <p><strong>Note:</strong> This is a template Business Associate Agreement. Covered entities should consult with legal counsel to ensure compliance with specific requirements.</p>
        </div>

        <div class="section">
            <h2>1. Definitions</h2>
            <p><strong>Business Associate:</strong> Scribsy, Inc.<br>
            <strong>Covered Entity:</strong> [Healthcare Provider Name]<br>
            <strong>Protected Health Information (PHI):</strong> As defined in 45 CFR § 164.501</p>
        </div>

        <div class="section">
            <h2>2. Permitted Uses and Disclosures</h2>
            <p>Business Associate may use or disclose PHI only:</p>
            <ul>
                <li>As necessary to perform the services outlined in the underlying agreement</li>
                <li>As required by law</li>
                <li>For proper management and administration of Business Associate</li>
                <li>To provide data aggregation services</li>
            </ul>
        </div>

        <div class="section">
            <h2>3. Prohibited Uses and Disclosures</h2>
            <p>Business Associate will not:</p>
            <ul>
                <li>Use or disclose PHI other than as permitted by this agreement</li>
                <li>Use or disclose PHI in a manner that would violate HIPAA if done by Covered Entity</li>
                <li>Sell PHI or receive direct or indirect remuneration for PHI</li>
                <li>Use PHI for marketing purposes without authorization</li>
            </ul>
        </div>

        <div class="section">
            <h2>4. Safeguards</h2>
            <p>Business Associate agrees to:</p>
            <ul>
                <li>Implement appropriate safeguards to prevent unauthorized use or disclosure of PHI</li>
                <li>Comply with applicable provisions of the HIPAA Security Rule</li>
                <li>Report security incidents to Covered Entity within 24 hours of discovery</li>
                <li>Conduct regular risk assessments and security monitoring</li>
            </ul>
        </div>

        <div class="section">
            <h2>5. Breach Notification</h2>
            <p>Business Associate will:</p>
            <ul>
                <li>Notify Covered Entity of any breach of unsecured PHI within 24 hours of discovery</li>
                <li>Provide details of the breach including affected individuals</li>
                <li>Assist with breach investigation and remediation</li>
                <li>Provide breach notification to individuals if required by Covered Entity</li>
            </ul>
        </div>

        <div class="section">
            <h2>6. Individual Rights</h2>
            <p>Business Associate agrees to:</p>
            <ul>
                <li>Provide access to PHI when requested by Covered Entity</li>
                <li>Make amendments to PHI as directed by Covered Entity</li>
                <li>Provide accounting of disclosures when requested</li>
                <li>Make PHI available for compliance investigations</li>
            </ul>
        </div>

        <div class="section">
            <h2>7. Return or Destruction of PHI</h2>
            <p>Upon termination of this agreement, Business Associate will:</p>
            <ul>
                <li>Return or destroy all PHI received from Covered Entity</li>
                <li>Retain no copies of PHI except as required by law</li>
                <li>Provide certification of destruction or return</li>
                <li>Continue to protect PHI that cannot be returned or destroyed</li>
            </ul>
        </div>

        <div class="section">
            <h2>8. Subcontractors</h2>
            <p>Business Associate will:</p>
            <ul>
                <li>Ensure any subcontractors that receive PHI agree to same restrictions</li>
                <li>Execute business associate agreements with all subcontractors</li>
                <li>Monitor subcontractor compliance with HIPAA requirements</li>
            </ul>
        </div>

        <div class="section">
            <h2>9. Term and Termination</h2>
            <p>This agreement:</p>
            <ul>
                <li>Is effective upon signing and continues until terminated</li>
                <li>May be terminated by either party with 30 days written notice</li>
                <li>Will terminate automatically upon material breach if not cured within 30 days</li>
            </ul>
        </div>

        <div class="section">
            <h2>10. Compliance Certification</h2>
            <p>Business Associate certifies that:</p>
            <ul>
                <li>All workforce members receive HIPAA training</li>
                <li>Regular compliance audits are conducted</li>
                <li>Incident response procedures are in place</li>
                <li>Risk assessments are performed annually</li>
            </ul>
        </div>
    </body>
    </html>
    """
    
    return baa

@router.get("/compliance-summary", response_class=JSONResponse)
def get_compliance_summary():
    """Get summary of HIPAA compliance measures"""
    
    return {
        "hipaa_compliance": {
            "privacy_rule": {
                "implemented": True,
                "features": [
                    "Privacy policy and notices",
                    "Individual rights management",
                    "Minimum necessary standards",
                    "Administrative safeguards"
                ]
            },
            "security_rule": {
                "implemented": True,
                "features": [
                    "Access controls and user authentication",
                    "Audit logging and monitoring",
                    "Data encryption in transit and at rest",
                    "Session management and timeouts",
                    "Security headers and CSP"
                ]
            },
            "breach_notification": {
                "implemented": True,
                "features": [
                    "Incident detection and logging",
                    "Automated breach notification procedures",
                    "Risk assessment protocols",
                    "Individual notification capabilities"
                ]
            },
            "administrative_safeguards": {
                "implemented": True,
                "features": [
                    "Role-based access controls",
                    "User training requirements",
                    "Information security officer designation",
                    "Business associate agreements"
                ]
            },
            "physical_safeguards": {
                "implemented": "Partial",
                "note": "Physical safeguards depend on deployment environment"
            },
            "technical_safeguards": {
                "implemented": True,
                "features": [
                    "Unique user authentication",
                    "Automatic logoff",
                    "Encryption and decryption",
                    "Audit controls",
                    "Data integrity controls",
                    "Transmission security"
                ]
            }
        },
        "data_protection": {
            "retention_policy": True,
            "secure_deletion": True,
            "audit_logging": True,
            "access_controls": True,
            "encryption": True
        },
        "user_rights": {
            "access_right": True,
            "amendment_right": True,
            "accounting_of_disclosures": True,
            "restriction_requests": True,
            "confidential_communications": True
        }
    }