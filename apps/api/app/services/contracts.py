"""Employment contract generation — a full boilerplate agreement merged with
live staff data (role, salary, outlet, training bond terms). HR can freely
edit the returned HTML before sending — this is a starting point, not a
locked template.
"""

from datetime import date
from decimal import Decimal

from app.services import training_bond

FOOD_UNITS = {"Restaurant", "Bakery"}


def _format_naira(amount: Decimal | float) -> str:
    return f"₦{Decimal(amount):,.2f}"


def _format_date(d: date) -> str:
    return f"{d.day} {d.strftime('%B %Y')}"


def _duties_html(responsibilities: list) -> str:
    """Build Section 3 from the role's own responsibilities data.

    `responsibilities` is a list of [title, detail] pairs, as stored on the
    role record. Falls back to a generic line if the role has none on file.
    """
    if not responsibilities:
        return "<p>The Employee shall perform the duties associated with the role, and any other reasonable duties assigned by the Company from time to time.</p>"

    items = "".join(
        f"<li><strong>{title}</strong> — {detail}</li>"
        for title, detail in responsibilities
    )
    return f"""
    <p>The Employee's duties shall include, but are not limited to:</p>
    <ul>{items}</ul>
    <p>The Employee shall also perform other reasonable duties assigned by the
    Company in connection with the Employee's employment.</p>
    """


def _training_bond_clauses(hired_at: date | None) -> tuple[str, str]:
    """Returns (Section 7 body, acknowledgement bullet list) — empty strings
    if the staff member isn't training-bond eligible.
    """
    if not hired_at or not training_bond.is_eligible_for_bond(hired_at):
        return "", ""

    monthly = _format_naira(training_bond.MONTHLY_AMOUNT)
    total = _format_naira(training_bond.MONTHLY_AMOUNT * training_bond.DEDUCTION_MONTHS)
    deduction_months = training_bond.DEDUCTION_MONTHS
    payback_start = deduction_months + 1
    payback_end = training_bond.PAYBACK_MONTHS

    section = f"""
    <h2>7. Training Bond and Staff Development Contribution</h2>
    <p>7.1 The Company may incur costs in recruiting, onboarding, training, supervising,
    and developing new employees. In consideration of the training and onboarding
    provided to the Employee, the Parties agree to the following training bond
    arrangement.</p>
    <p>7.2 During the <strong>first {deduction_months} months of employment</strong>,
    the Company shall deduct <strong>{monthly} per month</strong> from the
    Employee's salary as a training bond contribution, subject to applicable law
    and any required authorization.</p>
    <p>7.3 The deduction shall apply for {deduction_months} consecutive months,
    resulting in a maximum accumulated training bond balance of
    <strong>{total}</strong>.</p>
    <p>7.4 The deductions shall be recorded by the Company and reflected in the
    Employee's payroll records.</p>
    <p>7.5 The accumulated amount shall be scheduled for repayment to the Employee
    from the <strong>{payback_start}th month through the {payback_end}th month of
    employment</strong>, subject to the conditions contained in this Contract.</p>
    <p>7.6 Where the Employee remains employed with the Company through the relevant
    repayment period and complies satisfactorily with the terms of employment, the
    Company shall process repayment of the applicable outstanding training bond
    balance according to its payroll and administrative procedures.</p>
    <p>7.7 Where the Employee voluntarily resigns, abandons employment, or otherwise
    leaves the Company's employment <strong>before completing {deduction_months} months
    of employment</strong>, the accumulated training bond contribution shall be
    forfeited and shall not be repayable, to the extent permitted by applicable law.</p>
    <p>7.8 Where the Employee leaves the Company's employment <strong>after completing
    {deduction_months} months but before completing {payback_end} months</strong>, the
    repayment of any outstanding training bond balance shall be at the
    <strong>Company's discretion</strong>, taking into account the circumstances of the
    Employee's departure, length of service, conduct, compliance with Company
    policies, outstanding obligations, and any costs incurred by the Company.</p>
    <p>7.9 Nothing in this clause shall prevent the Company from paying any amount
    where management determines that repayment is appropriate.</p>
    <p>7.10 Where the Company exercises discretion to repay the balance, the amount
    payable shall be calculated based on the Employee's actual accumulated training
    bond contributions remaining unpaid, subject to any lawful adjustment.</p>
    <p>7.11 The training bond shall not be treated as an additional salary
    entitlement or as part of the Employee's monthly gross salary.</p>
    <p>7.12 The Parties acknowledge that all deductions and repayment arrangements
    under this clause shall be administered in accordance with applicable Nigerian
    employment and wage laws.</p>
    """

    ack_items = f"""
    <li>The Employee understands the {deduction_months} month training bond
    contribution of {monthly} per month.</li>
    <li>The Employee understands that the maximum accumulated training bond
    contribution is {total}.</li>
    <li>The Employee understands the conditions governing repayment of the
    training bond.</li>
    <li>The Employee understands that leaving before completion of
    {deduction_months} months may result in forfeiture of the accumulated
    training bond contribution, subject to applicable law.</li>
    <li>The Employee understands that repayment after {deduction_months} months
    but before {payback_end} months is subject to the Company's discretion,
    subject to applicable law.</li>
    """
    return section, ack_items


def generate_contract_html(
    *,
    staff_name: str,
    role_name: str,
    role_responsibilities: list | None,
    unit: str,
    outlet_name: str,
    outlet_address: str | None,
    outlet_city: str | None,
    outlet_state: str | None,
    hired_at: date,
    gross_salary: Decimal,
) -> str:
    today = date.today()
    duties_html = _duties_html(role_responsibilities or [])
    bond_section, bond_ack_items = _training_bond_clauses(hired_at)

    location_parts = [p for p in [outlet_address, outlet_city, outlet_state] if p]
    company_location = ", ".join(location_parts) if location_parts else outlet_name

    is_food_role = unit in FOOD_UNITS
    food_safety_section = (
        f"""
    <h2>10. Food Safety and Hygiene</h2>
    <p>10.1 Because the Employee works in food preparation, strict compliance with
    food safety and hygiene requirements is mandatory.</p>
    <p>10.2 The Employee shall maintain appropriate personal hygiene and wear any
    required protective clothing or equipment.</p>
    <p>10.3 The Employee shall comply with instructions concerning handwashing,
    food storage, temperature control, cross contamination prevention, cleaning,
    waste disposal, and safe food handling.</p>
    <p>10.4 The Employee shall immediately report any suspected food contamination,
    illness, injury, unsafe condition, pest infestation, equipment malfunction, or
    other food safety concern to management.</p>
    <p>10.5 Failure to comply with reasonable food safety requirements may
    constitute serious misconduct where the conduct creates a significant risk to
    customers, employees, or the Company's business.</p>
    """
        if is_food_role
        else """
    <h2>10. Workplace Safety</h2>
    <p>10.1 The Employee shall comply with reasonable workplace health and safety
    instructions issued by the Company.</p>
    <p>10.2 The Employee shall use equipment and Company property properly and
    shall not deliberately operate equipment in a dangerous or unsafe manner.</p>
    <p>10.3 The Employee shall immediately report any accident, injury, hazard,
    equipment fault, or other safety concern to management.</p>
    <p>10.4 Failure to comply with reasonable safety requirements may constitute
    serious misconduct where the conduct creates a significant risk to customers,
    employees, or the Company's business.</p>
    """
    )

    # Renumber sections 11+ consistently regardless of section 7/10 branches —
    # section numbers in the body text below are fixed since 7 and 10 always
    # render (as bond-eligible-or-not / food-or-not variants), so no dynamic
    # renumbering is needed here.

    return f"""
    <h1 style="text-align:center;">EMPLOYMENT CONTRACT AGREEMENT</h1>
    <p>This Employment Contract Agreement, hereinafter referred to as the
    "Contract", is made on <strong>{_format_date(today)}</strong> between:</p>
    <p><strong>LEAD SUPERSTORE</strong>, {company_location}, hereinafter referred
    to as the <strong>"Company"</strong>,</p>
    <p>AND</p>
    <p><strong>{staff_name.upper()}</strong>, hereinafter referred to as the
    <strong>"Employee"</strong>.</p>
    <p>The Company and the Employee are collectively referred to as the
    <strong>"Parties"</strong>.</p>

    <h2>1. Appointment and Commencement of Employment</h2>
    <p>1.1 The Company hereby confirms the employment of the Employee as
    <strong>{role_name}</strong> at Lead Superstore, {outlet_name}.</p>
    <p>1.2 The Employee's employment commenced on
    <strong>{_format_date(hired_at)}</strong>.</p>
    <p>1.3 This Contract is formally documented and executed on
    <strong>{_format_date(today)}</strong>, and its terms shall govern the
    employment relationship from the effective commencement date stated above,
    except where a particular provision expressly states otherwise.</p>
    <p>1.4 The Employee accepts the appointment and agrees to perform the duties
    associated with the position diligently, honestly, professionally, and in
    accordance with the Company's lawful instructions, policies, procedures, and
    standards.</p>
    <p>1.5 The Employee acknowledges that employment with the Company carries
    responsibilities relating to customer service, hygiene, safety, protection of
    Company property, teamwork, and the proper operation of the business.</p>

    <h2>2. Job Title and Reporting</h2>
    <p>2.1 The Employee shall serve as <strong>{role_name}</strong>.</p>
    <p>2.2 The Employee shall report to their outlet supervisor, manager, or any
    other person designated by the Company.</p>
    <p>2.3 The Employee shall perform duties reasonably connected with the
    position and any other reasonable duties assigned by the Company according to
    operational requirements.</p>
    <p>2.4 The Company may reasonably modify the Employee's duties,
    responsibilities, work location within the Company's operations, or reporting
    arrangement where such modification is necessary for business operations and
    does not unlawfully alter the fundamental terms of employment.</p>

    <h2>3. Duties and Responsibilities</h2>
    {duties_html}

    <h2>4. Place of Work</h2>
    <p>4.1 The Employee's primary place of work shall be Lead Superstore,
    {company_location}.</p>
    <p>4.2 Where reasonably required for the Company's operations, the Employee
    may be transferred or required to perform duties at another Company location
    (outlet) or at another location connected with the Company's business,
    subject to reasonable notice where practicable.</p>

    <h2>5. Working Hours and Attendance</h2>
    <p>5.1 The Employee shall work according to the Company's approved work
    schedule.</p>
    <p>5.2 Working hours, shift arrangements, rest periods, and weekly schedules
    may vary according to business requirements.</p>
    <p>5.3 The Employee is required to report to work on time, properly dressed,
    physically prepared for work, and ready to commence duties at the scheduled
    time.</p>
    <p>5.4 Repeated lateness, unauthorized absence, leaving the workplace without
    authorization, or failure to comply with the approved work schedule may
    constitute misconduct and may result in disciplinary action.</p>
    <p>5.5 Where the Employee is unable to attend work due to illness, emergency,
    or another legitimate reason, the Employee shall notify the appropriate
    supervisor or management as soon as reasonably practicable.</p>
    <p>5.6 Absence without authorization or failure to communicate with
    management may be treated as unauthorized absence and may result in
    disciplinary action.</p>

    <h2>6. Salary and Payment</h2>
    <p>6.1 The Employee's gross monthly salary shall be:</p>
    <p style="text-align:center;"><strong>{_format_naira(gross_salary)}</strong></p>
    <p>6.2 Salary shall normally be paid monthly in arrears through the Company's
    approved payment method.</p>
    <p>6.3 Salary shall be subject to lawful deductions and any deductions
    expressly authorized by the Employee and permitted by applicable law.</p>
    <p>6.4 The Company reserves the right to make lawful deductions relating to
    statutory obligations, authorized employee deductions, approved advances, or
    other amounts that may properly be deducted under applicable law.</p>
    <p>6.5 No deduction shall be made from the Employee's salary except where such
    deduction is permitted or authorized under applicable law or under a valid
    written agreement between the Parties.</p>

    {bond_section}

    <h2>8. Probation and Performance</h2>
    <p>8.1 The Employee shall be subject to an initial probationary period of
    <strong>six months</strong>, unless otherwise confirmed or extended in
    writing by the Company.</p>
    <p>8.2 During probation, the Company shall assess the Employee's attendance
    and punctuality, quality and consistency of work, technical skills relevant to
    the role, ability to follow instructions, teamwork and communication,
    customer service conduct, care of Company property, compliance with Company
    policies, and general reliability and suitability for the position.</p>
    <p>8.3 Successful completion of probation does not prevent the Company from
    taking disciplinary or other lawful employment action where subsequent
    performance or conduct warrants it.</p>

    <h2>9. Workplace Conduct</h2>
    <p>9.1 The Employee shall conduct themselves professionally and respectfully
    toward customers, supervisors, colleagues, suppliers, visitors, and other
    persons dealing with the Company.</p>
    <p>9.2 The Employee shall not engage in harassment, threats, violence,
    intimidation, fighting, abusive conduct, theft, fraud, dishonesty, deliberate
    damage to property, or other serious misconduct.</p>
    <p>9.3 The Employee shall not report to work under the influence of alcohol,
    illegal drugs, or any substance that materially impairs the Employee's ability
    to perform their duties safely and effectively.</p>
    <p>9.4 The Employee shall not remove, consume, sell, transfer, or give away
    Company stock, money, equipment, supplies, or other property without proper
    authorization.</p>
    <p>9.5 Personal use of Company equipment, supplies, facilities, or resources
    shall require authorization where applicable.</p>

    {food_safety_section}

    <h2>11. Company Property and Stock</h2>
    <p>11.1 All money, stock, equipment, documents, uniforms, keys, devices,
    records, and other property supplied by or belonging to the Company shall
    remain the property of the Company.</p>
    <p>11.2 The Employee shall exercise reasonable care in handling Company
    property.</p>
    <p>11.3 Any loss, damage, misuse, or suspected theft shall be reported
    immediately.</p>
    <p>11.4 Upon termination or cessation of employment, the Employee shall
    immediately return all Company property in their possession or control.</p>
    <p>11.5 Any deduction relating to loss or damage shall only be made where
    permitted by applicable law or otherwise properly authorized.</p>

    <h2>12. Confidentiality</h2>
    <p>12.1 During and after employment, the Employee shall keep confidential all
    non public information relating to the Company's business.</p>
    <p>12.2 Confidential information includes, but is not limited to pricing and
    costing information, supplier information, customer information, sales and
    financial information, business strategies, operational procedures, staff
    information, passwords and access credentials, internal documents and
    records, and any other information that a reasonable person would understand
    to be confidential.</p>
    <p>12.3 The Employee shall not disclose, copy, reproduce, transfer, publish,
    or use confidential information for personal benefit or for the benefit of
    another person or business without authorization.</p>
    <p>12.4 This obligation shall continue after the Employee's employment ends,
    except where disclosure is required by law.</p>

    <h2>13. Company Policies</h2>
    <p>13.1 The Employee agrees to comply with all reasonable Company policies,
    procedures, instructions, notices, and operational standards communicated to
    the Employee.</p>
    <p>13.2 Company policies may cover attendance, uniforms, hygiene, customer
    service, cash handling, stock management, workplace safety, social media use,
    confidentiality, disciplinary procedures, and other operational matters.</p>
    <p>13.3 Where a Company policy conflicts with applicable law, the applicable
    law shall prevail.</p>

    <h2>14. Leave and Time Off</h2>
    <p>14.1 The Employee shall be entitled to weekly off and statutory employment
    benefits applicable to the Employee under the Company's applicable policies
    and Nigerian law.</p>
    <p>14.2 Off shall normally follow approved weekly rosters except in genuine
    emergencies or circumstances where prior approval is not reasonably
    possible.</p>
    <p>14.3 Unauthorized absence shall not automatically be treated as approved
    leave.</p>

    <h2>15. Disciplinary Action</h2>
    <p>15.1 Where the Employee violates this Contract, Company policies, lawful
    instructions, or acceptable standards of workplace conduct, the Company may
    take appropriate disciplinary action.</p>
    <p>15.2 Depending on the nature and seriousness of the conduct, disciplinary
    action may include verbal warning, written warning, suspension where lawful
    and appropriate, or termination of employment.</p>
    <p>15.3 Serious misconduct may justify termination without notice where
    permitted by applicable law and following any applicable procedural
    requirements.</p>
    <p>15.4 Examples of conduct that may constitute serious misconduct include
    theft, fraud, violence, deliberate damage to Company property, serious
    insubordination, serious breach of confidentiality, falsification of records,
    serious safety violations, or other conduct that substantially damages the
    Company's legitimate interests.</p>

    <h2>16. Termination of Employment</h2>
    <p>16.1 Either Party may terminate the employment relationship by giving the
    notice required under applicable law, this Contract, or the Company's
    applicable employment policy, whichever provides the legally applicable
    standard.</p>
    <p>16.2 The Company may terminate employment for misconduct, poor
    performance, incapacity, operational reasons, or other lawful grounds,
    subject to applicable law and any required procedure.</p>
    <p>16.3 The Employee may resign from employment by providing the required
    notice.</p>
    <p>16.4 The Company may, where legally permissible, make payment in lieu of
    notice or require the Employee to serve the applicable notice period.</p>
    <p>16.5 Where employment is terminated, the Company shall calculate the
    Employee's final salary and other applicable entitlements in accordance with
    applicable law and the terms of this Contract.</p>
    <p>16.6 The Employee shall return all Company property before or upon the
    final day of employment.</p>

    <h2>17. Training Bond Upon Termination</h2>
    <p>17.1 The training bond arrangement in Section 7, where applicable to this
    Employee, shall apply where the Employee leaves the Company's employment
    during the first twelve months.</p>
    <p>17.2 An Employee who leaves before completing six months shall forfeit the
    accumulated training bond contribution, subject always to applicable law.</p>
    <p>17.3 An Employee who leaves after completing six months but before
    completing twelve months shall not have an automatic entitlement to repayment
    of the outstanding balance. The decision to repay some or all of the balance
    shall rest with the Company, subject to applicable law.</p>
    <p>17.4 Nothing in this Section shall authorize an unlawful deduction from
    wages or any other payment legally due to the Employee.</p>

    <h2>18. Conflict of Interest</h2>
    <p>18.1 The Employee shall not engage in activities that materially interfere
    with the Employee's duties or create an undisclosed conflict with the
    Company's legitimate business interests during working hours.</p>
    <p>18.2 The Employee shall not use Company confidential information,
    customers, suppliers, or property for personal commercial purposes without
    authorization.</p>

    <h2>19. Records and Company Information</h2>
    <p>19.1 The Employee shall provide accurate information required for
    employment administration, payroll, emergency contact purposes, and other
    legitimate Company requirements.</p>
    <p>19.2 The Employee shall promptly notify the Company of any material change
    to relevant personal or contact information.</p>
    <p>19.3 Company records created or maintained by the Employee in the course
    of employment shall remain the property of the Company.</p>

    <h2>20. Health, Safety and Workplace Responsibility</h2>
    <p>20.1 The Employee shall comply with reasonable workplace health and safety
    instructions.</p>
    <p>20.2 The Employee shall use equipment properly and shall not deliberately
    operate equipment in a dangerous manner.</p>
    <p>20.3 Accidents, injuries, hazards, equipment faults, and other safety
    incidents shall be reported promptly.</p>
    <p>20.4 The Employee shall cooperate with reasonable safety procedures
    implemented by the Company.</p>

    <h2>21. Non Solicitation and Protection of Business Interests</h2>
    <p>21.1 During employment, the Employee shall not use Company customer
    information, supplier relationships, pricing information, or other
    confidential business information to compete unfairly with the Company or
    assist another business.</p>
    <p>21.2 Nothing in this Contract shall prevent the Employee from engaging in
    lawful employment or business activities after employment, provided that the
    Employee does not unlawfully use or disclose the Company's confidential
    information.</p>

    <h2>22. Changes to the Contract</h2>
    <p>22.1 Any material amendment to this Contract shall be communicated to the
    Employee and documented in writing.</p>
    <p>22.2 Company policies may be updated from time to time where reasonably
    necessary for business operations, provided that such policies remain subject
    to applicable law.</p>

    <h2>23. Governing Law</h2>
    <p>23.1 This Contract shall be governed by and interpreted in accordance with
    the laws applicable to employment relationships in the
    <strong>Federal Republic of Nigeria</strong>.</p>
    <p>23.2 Any dispute arising from this Contract shall first be addressed
    through good faith discussion between the Employee and the Company's
    management.</p>
    <p>23.3 Where the dispute cannot be resolved internally, either Party may
    pursue any remedy available under applicable Nigerian law before the
    appropriate authority or court.</p>

    <h2>24. Severability</h2>
    <p>24.1 If any provision of this Contract is found to be invalid, unlawful,
    or unenforceable, that provision shall be interpreted or modified to the
    extent necessary to comply with applicable law, and the remaining provisions
    shall continue to operate to the extent legally permissible.</p>

    <h2>25. Entire Agreement</h2>
    <p>25.1 This Contract represents the principal written agreement between the
    Company and the Employee concerning the terms of employment described
    herein.</p>
    <p>25.2 Any prior verbal understanding that conflicts with this Contract
    shall not override this Contract unless confirmed in writing by the Company
    and the Employee.</p>

    <h2>26. Employee Acknowledgement</h2>
    <p>By signing this Contract, the Employee confirms that:</p>
    <ul>
      <li>The Employee has read the Contract.</li>
      <li>The Employee understands the terms and conditions contained in the
      Contract.</li>
      <li>The Employee has had the opportunity to ask questions concerning the
      Contract.</li>
      <li>The Employee understands the salary and applicable deductions.</li>
      {bond_ack_items}
      <li>The Employee agrees to comply with the Company's lawful policies,
      procedures, and instructions.</li>
      <li>The Employee agrees to perform their duties honestly, diligently, and
      responsibly.</li>
    </ul>

    <h2>27. Signatures</h2>
    <p><strong>FOR LEAD SUPERSTORE</strong></p>
    <p>Name: ______________________________________</p>
    <p>Position: ___________________________________</p>
    <p>Signature: __________________________________</p>
    <p>Date: ______________________________________</p>

    <p><strong>EMPLOYEE</strong></p>
    <p>Name: <strong>{staff_name}</strong></p>
    <p>Signature: __________________________________</p>
    <p>Date: ______________________________________</p>

    <p><strong>WITNESS</strong></p>
    <p>Name: ______________________________________</p>
    <p>Address: ___________________________________</p>
    <p>Phone Number: ______________________________</p>
    <p>Signature: __________________________________</p>
    <p>Date: ______________________________________</p>
    """
