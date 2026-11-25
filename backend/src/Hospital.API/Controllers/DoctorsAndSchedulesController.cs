using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Doctors;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/doctors")]
public class DoctorsController(IDoctorService doctorService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResponse<DoctorDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] int? departmentId,
        [FromQuery] bool? isActive,
        [FromQuery] bool? onlineOnly,
        CancellationToken ct)
        => Ok(await doctorService.GetDoctorsAsync(request, departmentId, isActive, onlineOnly, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<DoctorDto>> GetById(int id, CancellationToken ct)
        => Ok(await doctorService.GetByIdAsync(id, ct));

    [HttpGet("{id:int}/slots")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<TimeSlotDto>>> GetAvailableSlots(int id, [FromQuery] DateOnly date, CancellationToken ct)
        => Ok(await doctorService.GetAvailableSlotsAsync(id, date, ct));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DoctorDto>> Create([FromBody] CreateDoctorRequest request, CancellationToken ct)
    {
        var created = await doctorService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DoctorDto>> Update(int id, [FromBody] UpdateDoctorRequest request, CancellationToken ct)
        => Ok(await doctorService.UpdateAsync(id, request, ct));
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/schedules")]
public class SchedulesController(IDoctorService doctorService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DoctorScheduleDto>>> GetAll([FromQuery] int? doctorId, CancellationToken ct)
        => Ok(await doctorService.GetSchedulesAsync(doctorId, ct));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DoctorScheduleDto>> Create([FromBody] SaveDoctorScheduleRequest request, CancellationToken ct)
        => Ok(await doctorService.SaveScheduleAsync(request, null, ct));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DoctorScheduleDto>> Update(int id, [FromBody] SaveDoctorScheduleRequest request, CancellationToken ct)
        => Ok(await doctorService.SaveScheduleAsync(request, id, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await doctorService.DeleteScheduleAsync(id, ct);
        return NoContent();
    }
}
