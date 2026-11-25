using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Appointments;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/appointments")]
[Authorize]
public class AppointmentsController(IAppointmentService appointmentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AppointmentDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] DateOnly? date,
        [FromQuery] int? doctorId,
        [FromQuery] int? departmentId,
        [FromQuery] int? patientId,
        [FromQuery] string? status,
        CancellationToken ct)
        => Ok(await appointmentService.GetAppointmentsAsync(request, date, doctorId, departmentId, patientId, status, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id, CancellationToken ct)
        => Ok(await appointmentService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Receptionist,Patient")]
    public async Task<ActionResult<AppointmentDto>> Book([FromBody] BookAppointmentRequest request, CancellationToken ct)
    {
        var created = await appointmentService.BookAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPost("{id:int}/confirm")]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<AppointmentDto>> Confirm(int id, CancellationToken ct)
        => Ok(await appointmentService.ConfirmAsync(id, ct));

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Admin,Receptionist,Patient")]
    public async Task<ActionResult<AppointmentDto>> Cancel(int id, [FromBody] CancelAppointmentRequest request, CancellationToken ct)
        => Ok(await appointmentService.CancelAsync(id, request, ct));

    [HttpPost("{id:int}/no-show")]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<AppointmentDto>> MarkNoShow(int id, CancellationToken ct)
        => Ok(await appointmentService.MarkNoShowAsync(id, ct));

    [HttpPost("{id:int}/reschedule")]
    [Authorize(Roles = "Admin,Receptionist,Patient")]
    public async Task<ActionResult<AppointmentDto>> Reschedule(int id, [FromBody] RescheduleAppointmentRequest request, CancellationToken ct)
        => Ok(await appointmentService.RescheduleAsync(id, request, ct));
}
