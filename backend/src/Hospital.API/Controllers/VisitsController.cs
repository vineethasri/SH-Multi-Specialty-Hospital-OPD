using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Visits;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/visits")]
[Authorize]
public class VisitsController(IVisitService visitService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<VisitDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] DateOnly? date,
        [FromQuery] int? doctorId,
        [FromQuery] int? departmentId,
        [FromQuery] int? patientId,
        [FromQuery] string? status,
        CancellationToken ct)
        => Ok(await visitService.GetVisitsAsync(request, date, doctorId, departmentId, patientId, status, ct));

    [HttpGet("queue")]
    [Authorize(Roles = "Admin,Receptionist,Doctor")]
    public async Task<ActionResult<IReadOnlyList<VisitDto>>> GetQueue([FromQuery] int? doctorId, [FromQuery] DateOnly? date, CancellationToken ct)
        => Ok(await visitService.GetDoctorQueueAsync(doctorId, date, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VisitDto>> GetById(int id, CancellationToken ct)
        => Ok(await visitService.GetByIdAsync(id, ct));

    [HttpPost("check-in")]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<VisitDto>> CheckInAppointment([FromBody] CheckInAppointmentRequest request, CancellationToken ct)
    {
        var visit = await visitService.CheckInAppointmentAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = visit.Id, version = "1" }, visit);
    }

    [HttpPost("walk-in")]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<VisitDto>> CheckInWalkIn([FromBody] WalkInCheckInRequest request, CancellationToken ct)
    {
        var visit = await visitService.CheckInWalkInAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = visit.Id, version = "1" }, visit);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin,Receptionist,Doctor")]
    public async Task<ActionResult<VisitDto>> UpdateStatus(int id, [FromBody] UpdateVisitStatusRequest request, CancellationToken ct)
        => Ok(await visitService.UpdateStatusAsync(id, request, ct));

    [HttpPost("{id:int}/checkout")]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<VisitDto>> CheckOut(int id, [FromBody] CheckOutRequest? request, CancellationToken ct)
        => Ok(await visitService.CheckOutAsync(id, request?.Notes, ct));
}

public record CheckOutRequest(string? Notes);
