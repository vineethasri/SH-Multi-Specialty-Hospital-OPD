using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Patients;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/patients")]
[Authorize]
public class PatientsController(IPatientService patientService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<PatientDto>>> GetAll([FromQuery] PagedRequest request, CancellationToken ct)
        => Ok(await patientService.GetPatientsAsync(request, ct));

    [HttpGet("me")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<PatientDto>> GetMyProfile(CancellationToken ct)
        => Ok(await patientService.GetMyProfileAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(int id, CancellationToken ct)
        => Ok(await patientService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<PatientDto>> Create([FromBody] CreatePatientRequest request, CancellationToken ct)
    {
        var created = await patientService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Receptionist,Patient")]
    public async Task<ActionResult<PatientDto>> Update(int id, [FromBody] UpdatePatientRequest request, CancellationToken ct)
        => Ok(await patientService.UpdateAsync(id, request, ct));
}
