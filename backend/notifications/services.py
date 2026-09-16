from notifications.models import Notification, NotificationTypeChoices, NotificationStatusChoices


def create_notification(
    recipient,
    notification_type,
    message,
    related_invoice=None,
    status=NotificationStatusChoices.SENT
):
    """
    Create and dispatch a notification to the specified recipient.
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        message=message,
        related_invoice=related_invoice,
        status=status,
    )


def send_payment_confirmation(payment, receipt=None):
    """
    Send payment confirmation notification to the paying parent.
    """
    invoice = payment.invoice
    student_name = invoice.student.full_name if invoice and invoice.student else "Student"
    month_str = invoice.month.strftime("%B %Y") if invoice and invoice.month else ""
    
    receipt_no = None
    if receipt:
        receipt_no = receipt.receipt_number
    elif hasattr(payment, 'receipt'):
        receipt_no = payment.receipt.receipt_number
    else:
        receipt_no = f"RCP-{payment.id:06d}"

    message = (
        f"Payment Confirmation: We received {payment.amount} ETB for {student_name}"
        f"{f' ({month_str})' if month_str else ''}. Receipt Number: {receipt_no}."
    )

    return create_notification(
        recipient=payment.paid_by,
        notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
        message=message,
        related_invoice=invoice,
        status=NotificationStatusChoices.SENT
    )


def send_due_reminder(invoice):
    """
    Send due reminder notification to the student's parent.
    """
    parent = invoice.student.parent
    student_name = invoice.student.full_name
    month_str = invoice.month.strftime("%B %Y") if invoice.month else ""

    message = (
        f"Due Reminder: School fee invoice of {invoice.amount} ETB for {student_name}"
        f"{f' ({month_str})' if month_str else ''} is due on {invoice.due_date}. "
        "Please complete your payment before the due date."
    )

    return create_notification(
        recipient=parent,
        notification_type=NotificationTypeChoices.DUE_REMINDER,
        message=message,
        related_invoice=invoice,
        status=NotificationStatusChoices.SENT
    )


def send_overdue_alert(invoice):
    """
    Send overdue alert notification to the student's parent.
    """
    parent = invoice.student.parent
    student_name = invoice.student.full_name
    month_str = invoice.month.strftime("%B %Y") if invoice.month else ""

    message = (
        f"Overdue Alert: School fee invoice of {invoice.amount} ETB for {student_name}"
        f"{f' ({month_str})' if month_str else ''} was due on {invoice.due_date} and is now overdue. "
        "Please settle the outstanding balance promptly."
    )

    return create_notification(
        recipient=parent,
        notification_type=NotificationTypeChoices.OVERDUE_ALERT,
        message=message,
        related_invoice=invoice,
        status=NotificationStatusChoices.SENT
    )
