"""Pay slip generation — a per-employee summary of one payroll period,
rendered to PDF via xhtml2pdf like contracts. Available for any period
status; the numbers are whatever the entry currently holds (draft entries
can still change until approved)."""

from decimal import Decimal


def _format_naira(amount: Decimal | float) -> str:
    return f"₦{Decimal(str(amount)):,.2f}"


def generate_payslip_html(
    *,
    staff_name: str,
    role_name: str,
    outlet_name: str,
    period_label: str,
    period_status: str,
    gross_salary: Decimal,
    working_days: int,
    deduction_items: list[dict],
    adjustment_amount: Decimal,
    adjustment_note: str | None,
    net_pay: Decimal,
) -> str:
    deduction_rows = "".join(
        f"""
        <tr>
            <td>{item['description'] or item['source_type'].replace('_', ' ').title()}</td>
            <td style="text-align:right;">{_format_naira(item['amount'])}</td>
        </tr>
        """
        for item in deduction_items
    )
    if not deduction_rows:
        deduction_rows = '<tr><td colspan="2" style="color:#888;">No deductions this period</td></tr>'

    total_deductions = sum(Decimal(str(i["amount"])) for i in deduction_items)

    adjustment_row = ""
    if adjustment_amount:
        label = "Bonus / owed pay" if adjustment_amount > 0 else "Withholding"
        sign = "+" if adjustment_amount > 0 else "-"
        adjustment_row = f"""
        <tr>
            <td>{label}{f' — {adjustment_note}' if adjustment_note else ''}</td>
            <td style="text-align:right;">{sign} {_format_naira(abs(adjustment_amount))}</td>
        </tr>
        """

    return f"""
    <h1 style="text-align:center;">PAY SLIP</h1>
    <p style="text-align:center; color:#555;">Lead Superstore</p>
    <hr/>

    <table style="width:100%; margin-top:16px;">
        <tr>
            <td><strong>Employee:</strong> {staff_name}</td>
            <td style="text-align:right;"><strong>Period:</strong> {period_label}</td>
        </tr>
        <tr>
            <td><strong>Role:</strong> {role_name}</td>
            <td style="text-align:right;"><strong>Outlet:</strong> {outlet_name}</td>
        </tr>
        <tr>
            <td><strong>Days worked:</strong> {working_days}/30</td>
            <td style="text-align:right;"><strong>Status:</strong> {period_status.upper()}</td>
        </tr>
    </table>

    <h2 style="margin-top:24px;">Earnings</h2>
    <table style="width:100%; border-collapse:collapse;">
        <tr>
            <td>Gross salary</td>
            <td style="text-align:right;">{_format_naira(gross_salary)}</td>
        </tr>
    </table>

    <h2 style="margin-top:24px;">Deductions</h2>
    <table style="width:100%; border-collapse:collapse;">
        {deduction_rows}
        {adjustment_row}
        <tr style="border-top:1px solid #333;">
            <td><strong>Total deductions</strong></td>
            <td style="text-align:right;"><strong>{_format_naira(total_deductions)}</strong></td>
        </tr>
    </table>

    <hr/>
    <table style="width:100%; margin-top:16px;">
        <tr>
            <td style="font-size:14pt;"><strong>Net pay</strong></td>
            <td style="text-align:right; font-size:14pt;"><strong>{_format_naira(net_pay)}</strong></td>
        </tr>
    </table>

    <p style="margin-top:32px; color:#888; font-size:9pt;">
        This is a system-generated pay slip and does not require a signature.
    </p>
    """
