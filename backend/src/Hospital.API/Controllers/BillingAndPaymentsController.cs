using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Billing;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/bills")]
[Authorize]
public class BillsController(IBillingService billingService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<BillDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] int? patientId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken ct)
        => Ok(await billingService.GetBillsAsync(request, patientId, status, fromDate, toDate, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BillDto>> GetById(int id, CancellationToken ct)
        => Ok(await billingService.GetBillByIdAsync(id, ct));

    [HttpGet("by-visit/{visitId:int}")]
    public async Task<ActionResult<BillDto>> GetByVisitId(int visitId, CancellationToken ct)
        => Ok(await billingService.GetBillByVisitIdAsync(visitId, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<BillDto>> Generate([FromBody] GenerateBillRequest request, CancellationToken ct)
    {
        var bill = await billingService.GenerateBillAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = bill.Id, version = "1" }, bill);
    }
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/payments")]
[Authorize]
public class PaymentsController(IBillingService billingService, IPaymentGateway paymentGateway) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<PaymentDto>>> GetAll(
        [FromQuery] PagedRequest request,
        [FromQuery] int? patientId,
        [FromQuery] string? method,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken ct)
        => Ok(await billingService.GetPaymentsAsync(request, patientId, method, fromDate, toDate, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PaymentDto>> GetById(int id, CancellationToken ct)
        => Ok(await billingService.GetPaymentByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Admin,Receptionist")]
    public async Task<ActionResult<PaymentDto>> Record([FromBody] RecordPaymentRequest request, CancellationToken ct)
    {
        var payment = await billingService.RecordPaymentAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = payment.Id, version = "1" }, payment);
    }

    [HttpGet("gateway-status")]
    public IActionResult GatewayStatus()
        => Ok(new { provider = paymentGateway.ProviderName, isConfigured = paymentGateway.IsConfigured });
}
