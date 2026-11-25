using Hospital.Domain.Common;

namespace Hospital.Domain.Entities;

public class Doctor : BaseEntity
{
    public int UserId { get; set; }
    public int DepartmentId { get; set; }
    public string DoctorCode { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public int ExperienceYears { get; set; }
    public decimal ConsultationFee { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public int AverageConsultationMinutes { get; set; } = 15;
    public bool IsAvailableForOnlineBooking { get; set; } = true;
    public bool IsActive { get; set; } = true;

    public User User { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public ICollection<DoctorSchedule> Schedules { get; set; } = new List<DoctorSchedule>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
    public ICollection<Consultation> Consultations { get; set; } = new List<Consultation>();
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
}
