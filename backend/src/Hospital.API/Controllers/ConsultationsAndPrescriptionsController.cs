using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Consultations;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/consultations")]
[Authorize]
public class ConsultationsController(IConsultationService consultationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<ConsultationDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] int? doctorId,
        [FromQuery] int? patientId,
        CancellationToken ct)
        => Ok(await consultationService.GetConsultationsAsync(request, doctorId, patientId, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConsultationDto>> GetById(int id, CancellationToken ct)
        => Ok(await consultationService.GetByIdAsync(id, ct));

    [HttpGet("by-visit/{visitId:int}")]
    public async Task<ActionResult<ConsultationDto>> GetByVisitId(int visitId, CancellationToken ct)
        => Ok(await consultationService.GetByVisitIdAsync(visitId, ct));

    [HttpPost("start")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ConsultationDto>> Start([FromBody] StartConsultationRequest request, CancellationToken ct)
    {
        var created = await consultationService.StartConsultationAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ConsultationDto>> Save(int id, [FromBody] SaveConsultationRequest request, CancellationToken ct)
        => Ok(await consultationService.SaveConsultationAsync(id, request, ct));

    [HttpPost("{id:int}/complete")]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<ConsultationDto>> Complete(int id, [FromBody] SaveConsultationRequest? request, CancellationToken ct)
        => Ok(await consultationService.CompleteConsultationAsync(id, request, ct));
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/prescriptions")]
[Authorize]
public class PrescriptionsController(IConsultationService consultationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<PrescriptionDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] int? patientId,
        [FromQuery] int? doctorId,
        CancellationToken ct)
        => Ok(await consultationService.GetPrescriptionsAsync(request, patientId, doctorId, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PrescriptionDto>> GetById(int id, CancellationToken ct)
        => Ok(await consultationService.GetPrescriptionByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Doctor")]
    public async Task<ActionResult<PrescriptionDto>> Save([FromBody] SavePrescriptionRequest request, CancellationToken ct)
        => Ok(await consultationService.SavePrescriptionAsync(request, ct));
}
