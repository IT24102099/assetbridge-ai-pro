import os
from pathlib import Path


def create_pdf(filename: str, title: str, domain: str, sections: list[tuple[str, str]]) -> None:
    """
    Creates a real, standard-compliant binary PDF 1.4 file with text formatting,
    page tree, font dictionary, and stream objects without external library dependencies.
    """
    path = Path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Construct stream text
    stream_lines = [
        "BT",
        "/F1 18 Tf",
        "50 750 Td",
        f"({title}) Tj",
        "/F1 10 Tf",
        "0 -20 Td",
        f"(Domain: {domain} | AssetBridge AI Knowledge Document) Tj",
        "0 -15 Td",
        "(--------------------------------------------------------------------------------) Tj",
        "/F1 11 Tf",
    ]
    
    y_offset = -25
    for heading, body in sections:
        stream_lines.append(f"0 {y_offset} Td")
        stream_lines.append(f"/F1 13 Tf ({heading}) Tj")
        stream_lines.append("/F1 10 Tf 0 -15 Td")
        
        # Word wrap body lines roughly
        words = body.replace("\n", " ").split(" ")
        current_line = []
        for word in words:
            if len(" ".join(current_line + [word])) > 80:
                clean_line = " ".join(current_line).replace("(", "\\(").replace(")", "\\)")
                stream_lines.append(f"({clean_line}) Tj")
                stream_lines.append("0 -13 Td")
                current_line = [word]
            else:
                current_line.append(word)
        if current_line:
            clean_line = " ".join(current_line).replace("(", "\\(").replace(")", "\\)")
            stream_lines.append(f"({clean_line}) Tj")
            stream_lines.append("0 -15 Td")
        y_offset = -10

    stream_lines.append("ET")
    stream_content = "\n".join(stream_lines)
    stream_bytes = stream_content.encode("latin-1", "replace")
    
    objects = []
    # Obj 1: Catalog
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    # Obj 2: Pages
    objects.append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj")
    # Obj 3: Page
    objects.append("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj")
    # Obj 4: Contents Stream
    objects.append(f"4 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n{stream_content}\nendstream\nendobj")
    # Obj 5: Font
    objects.append("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")
    
    pdf_header = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body_data = pdf_header.encode("latin-1")
    xref = [0]
    
    for obj in objects:
        xref.append(len(body_data))
        body_data += (obj + "\n").encode("latin-1")
        
    startxref = len(body_data)
    xref_table = f"xref\n0 {len(xref)}\n0000000000 65535 f \n"
    for offset in xref[1:]:
        xref_table += f"{offset:010d} 00000 n \n"
        
    trailer = f"trailer\n<< /Size {len(xref)} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n"
    body_data += (xref_table + trailer).encode("latin-1")
    
    with open(path, "wb") as f:
        f.write(body_data)
    print(f"Generated PDF: {path} ({len(body_data)} bytes)")


def generate_all_knowledge_documents(base_dir: str = "knowledge_docs"):
    root = Path(base_dir)
    
    # 1. INCIDENT_KNOWLEDGE
    create_pdf(
        str(root / "INCIDENT" / "Water_Leakage_Guide.pdf"),
        "Water Leakage Guide",
        "INCIDENT_KNOWLEDGE",
        [
            ("1. Immediate Safety Actions", "Upon identifying an active water leak, prioritize life safety. If water is leaking near electrical outlets, ceiling lights, or distribution boards, immediately isolate the main electrical circuit breaker. Do not touch wet metal surfaces or standing water if energized."),
            ("2. Main Water Supply Isolation", "Locate the primary stopcock or main water shut-off valve (typically located near the ground floor utility inlet, water meter, or overhead tank manifold). Turn the valve clockwise until firmly seated to stop the main supply. Open the lowest garden tap to relieve residual pipe pressure."),
            ("3. Common Leak Sources and Diagnostics", "Common sources include broken PVC pipe joints, failed rubber washers on compression fittings, corroded galvanized iron pipes, loose flex hoses beneath sinks, and failed waterproofing membrane on flat slabs. Check pressure gauges and inspect joint seals for hairline cracking."),
            ("4. Temporary Containment & Evidence Gathering", "Place catch basins or buckets under the drip path. Clear furniture and valuables from the damp perimeter. Capture at least 3 high-resolution timestamped photographs: wide perimeter view, close-up of the leaking joint/component, and secondary moisture stains."),
            ("5. Professional Inspection Escalation", "Contact your designated AssetBridge local representative. For pressurized supply line bursts or concealed slab leaks, mandate a certified plumbing contractor inspection within 4 to 12 hours.")
        ]
    )
    
    create_pdf(
        str(root / "INCIDENT" / "Emergency_Maintenance_Checklist.pdf"),
        "Emergency Maintenance Checklist",
        "INCIDENT_KNOWLEDGE",
        [
            ("1. Emergency Triage Classification", "Emergencies are categorized into Class A (Immediate structural collapse risk or live electrical hazard), Class B (Uncontrolled water ingress or sewer backflow), and Class C (Minor non-structural utility failure)."),
            ("2. Electrical Emergencies", "If sparks, burning plastic odor, or RCD trip recurrence occurs, switch off the main double-pole isolator switch. Never attempt DIY wire splicing or fuse bypassing."),
            ("3. Structural & Safety Hazards", "For severe wall cracking (>5mm shear cracks), sagging ceiling joists, or waterlogged plasterboard, evacuate the affected room immediately and cordon off the threshold."),
            ("4. What Users Should NOT Do", "Do not operate electrical switches while standing in water. Do not apply structural sealants over pressurized water leaks without isolating supply. Do not authorize unverified third-party contractors without representative logging."),
            ("5. Representative Mobilization Protocol", "Submit emergency incident via the AssetBridge mobile app. The platform will automatically notify the verified local representative within a 15km radius.")
        ]
    )

    # 2. PROVIDER_KNOWLEDGE
    create_pdf(
        str(root / "PROVIDER" / "Provider_Verification_and_Selection_Guide.pdf"),
        "Provider Verification and Selection Guide",
        "PROVIDER_KNOWLEDGE",
        [
            ("1. Contractor Credentialing Standards", "All plumbing, electrical, and structural contractors registered on AssetBridge must maintain national vocational qualification (NVQ Level 4 or equivalent), CIDA registration, and verified business registration certificates."),
            ("2. Identity and Background Verification", "Local representatives personally inspect contractor physical business locations, national identity cards (NIC), and minimum 2 verifiable references from past residential projects."),
            ("3. Historical Performance & Rating Metric", "Contractors are scored based on 4 criteria: On-time arrival rate (>90%), Quotation variance accuracy (<10% deviation), Customer satisfaction score (minimum 4.2/5.0), and Warranty compliance history."),
            ("4. Tier Classification & Dispatch Bounds", "Tier 1: Emergency & Structural Specialists (Approved for budgets up to 250,000 LKR). Tier 2: General Maintenance Contractors (Approved up to 75,000 LKR). Tier 3: Minor Task Technicians (Approved up to 25,000 LKR).")
        ]
    )
    
    create_pdf(
        str(root / "PROVIDER" / "Service_Provider_Availability_and_Skills_Guide.pdf"),
        "Service Provider Availability and Skills Guide",
        "PROVIDER_KNOWLEDGE",
        [
            ("1. Trade Skill Categorization", "Service providers must hold explicit verified skills in the registry: Plumbing (Pipe welding, PPR jointing, drainage diagnostics), Electrical (Single-phase wiring, distribution boards, surge protection), Waterproofing (Torch-on membrane, polymer slurry, elastomeric coating), and Carpentry/Roofing."),
            ("2. Real-Time Availability & Radius Filtering", "Provider dispatch algorithms calculate geodesic distance from property coordinates. For emergency incidents, only providers within 20km with 'Available' status in the current time slot are ranked."),
            ("3. Coordination with Overseas Owners & Local Reps", "Service providers must communicate directly through the platform chat and submit quotation line items digitally. Direct cash payments outside platform escrow/milestones are strictly prohibited.")
        ]
    )

    # 3. MAINTENANCE_KNOWLEDGE
    create_pdf(
        str(root / "MAINTENANCE" / "Residential_Maintenance_Guide.pdf"),
        "Residential Maintenance Guide",
        "MAINTENANCE_KNOWLEDGE",
        [
            ("1. Preventive Maintenance Lifecycle", "Overseas property preservation requires seasonal maintenance cycles: Pre-monsoon roof inspection (April & September), Bi-annual plumbing pressure test, Annual electrical insulation resistance test (Megger test), and Quarterly timber pest inspection."),
            ("2. Common Pipe Failures and Causes", "Pipe leaks in Sri Lankan residential properties are primarily caused by: High municipal pressure spikes (>4.5 bar) causing joint failure, Galvanic corrosion from mixing brass and galvanized fittings, UV degradation on exposed PVC lines, and Ground settlement beneath ground slabs."),
            ("3. Water Tank & Pump Maintenance", "Overhead polyethylene and concrete tanks require cleaning and disinfection every 6 months. Pressure pumps must have dry-run protection and functional expansion bladders.")
        ]
    )
    
    create_pdf(
        str(root / "MAINTENANCE" / "Inspection_and_Quotation_Evaluation_Guide.pdf"),
        "Inspection and Quotation Evaluation Guide",
        "MAINTENANCE_KNOWLEDGE",
        [
            ("1. On-Site Digital Inspection Standards", "Local representatives must complete standardized digital checklists: Structural integrity, moisture meter readings (<15% acceptable, >25% active leak), photographic proof of damaged sections, and preliminary root-cause assessment."),
            ("2. Line-Item Quotation Auditing", "Quotations must break down: Material costs (Itemized brand, grade, and unit price), Labor hours (Standard trade hourly rates), Transport/access allowance, and Value Added Tax where applicable."),
            ("3. Budget Comparison & Variance Control", "If contractor quote exceeds preliminary representative estimate by more than 15%, the AI Cost Agent flags the discrepancy and requests line-item justification prior to manager submission."),
            ("4. Warranty Terms & Guarantees", "Mandatory warranty terms under AssetBridge standards: Minimum 12 months on structural waterproofing, 6 months on pressure plumbing, and 12 months on new electrical sub-circuits.")
        ]
    )

    # 4. GOVERNANCE_CONTINUITY_KNOWLEDGE
    create_pdf(
        str(root / "GOVERNANCE" / "Maintenance_Approval_and_Safety_Policy.pdf"),
        "Maintenance Approval and Safety Policy",
        "GOVERNANCE_CONTINUITY_KNOWLEDGE",
        [
            ("1. Human-in-the-Loop Governance Boundary", "AI agents formulate recommendations, analyze cost variances, and prepare approval requests. Under no circumstance may an AI agent approve high-impact financial outlays or contractor appointments autonomously."),
            ("2. Manager & Admin Approval Mandate", "All repair proposals with estimated cost exceeding 10,000 LKR or involving structural modification require formal digital authorization by the overseas property manager or verified owner."),
            ("3. Safety Compliance & Lockout/Tagout", "Before work commencement, contractors must sign off on utility isolation protocols. For electrical repairs, the main breaker must be locked out, and for plumbing, the main stopcock tagged.")
        ]
    )
    
    create_pdf(
        str(root / "GOVERNANCE" / "Property_Continuity_and_Follow_up_Guide.pdf"),
        "Property Continuity and Follow-up Guide",
        "GOVERNANCE_CONTINUITY_KNOWLEDGE",
        [
            ("1. Property Digital Twin & Continuity Ledger", "Every completed maintenance job updates the permanent property asset history. The record stores before/after photographs, contractor warranty certificates, invoice receipts, and material specifications."),
            ("2. Automated Post-Maintenance Follow-Up Schedule", "The platform automatically schedules continuity checks: 30-Day Check (Moisture meter re-test by representative), 60-Day Check (Tenant/caretaker satisfaction review), and 180-Day Pre-Warranty Expiration Audit."),
            ("3. Audit Logging & Non-Repudiation", "All agent telemetry, tool executions, approval timestamps, and financial disbursements are written to an immutable append-only audit log with cryptographic hash verification.")
        ]
    )


if __name__ == "__main__":
    generate_all_knowledge_documents()
