namespace Hospital.Domain.Enums;

public enum RoleType
{
    Admin = 1,
    Receptionist = 2,
    Doctor = 3,
    Patient = 4
}

public enum Gender
{
    Male = 1,
    Female = 2,
    Other = 3
}

public enum AppointmentStatus
{
    Booked = 1,
    Confirmed = 2,
    CheckedIn = 3,
    Completed = 4,
    Cancelled = 5,
    NoShow = 6
}

public enum BookingSource
{
    Online = 1,
    Reception = 2
}

public enum VisitType
{
    Appointment = 1,
    WalkIn = 2
}

public enum VisitStatus
{
    Scheduled = 1,
    CheckedIn = 2,
    Waiting = 3,
    InConsultation = 4,
    ConsultationCompleted = 5,
    BillingPending = 6,
    ReadyForCheckout = 7,
    CheckedOut = 8,
    Cancelled = 9,
    NoShow = 10
}

public enum ConsultationStatus
{
    InProgress = 1,
    Completed = 2
}

public enum BillStatus
{
    Draft = 1,
    Pending = 2,
    PartiallyPaid = 3,
    Paid = 4,
    Cancelled = 5
}

public enum BillItemCategory
{
    Consultation = 1,
    Registration = 2,
    Procedure = 3,
    Diagnostic = 4,
    Other = 5
}

public enum PaymentMethod
{
    Cash = 1,
    UPI = 2,
    Card = 3,
    Razorpay = 4
}

public enum PaymentStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 3,
    Refunded = 4
}

public enum NotificationType
{
    System = 1,
    AppointmentBooked = 2,
    AppointmentCancelled = 3,
    CheckedIn = 4,
    ConsultationStarted = 5,
    ConsultationCompleted = 6,
    BillGenerated = 7,
    PaymentReceived = 8,
    CheckedOut = 9
}
