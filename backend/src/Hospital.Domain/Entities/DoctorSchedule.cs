using Hospital.Domain.Common;

namespace Hospital.Domain.Entities;

public class DoctorSchedule : BaseEntity
{
    public int DoctorId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int SlotDurationMinutes { get; set; } = 15;
    public int MaxPatientsPerSlot { get; set; } = 1;
    public bool IsActive { get; set; } = true;

    public Doctor Doctor { get; set; } = null!;
}
