using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Dashboard;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/notifications")]
[Authorize]
public class NotificationsController(IDashboardAndReportService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<NotificationDto>>> GetMyNotifications([FromQuery] PagedRequest request, [FromQuery] bool? unreadOnly, CancellationToken ct)
        => Ok(await service.GetMyNotificationsAsync(request, unreadOnly, ct));

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        await service.MarkNotificationReadAsync(id, ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await service.MarkAllNotificationsReadAsync(ct);
        return NoContent();
    }
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[Authorize]
public class DashboardController(IDashboardAndReportService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardAnalyticsDto>> Get([FromQuery] DateOnly? date, CancellationToken ct)
        => Ok(await service.GetDashboardAsync(date, ct));
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/reports")]
[Authorize(Roles = "Admin,Receptionist")]
public class ReportsController(IDashboardAndReportService service) : ControllerBase
{
    [HttpGet("billing")]
    public async Task<ActionResult<BillingReportSummaryDto>> GetBillingReport([FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        return Ok(await service.GetBillingReportAsync(fromDate ?? today.AddDays(-30), toDate ?? today, ct));
    }

    [HttpGet("audit-logs")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResponse<AuditLogDto>>> GetAuditLogs(
        [FromQuery] PagedRequest request,
        [FromQuery] string? action,
        [FromQuery] string? entityName,
        CancellationToken ct)
        => Ok(await service.GetAuditLogsAsync(request, action, entityName, ct));
}
