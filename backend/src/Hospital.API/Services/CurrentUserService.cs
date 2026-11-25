using System.Security.Claims;
using Hospital.Application.Interfaces;

namespace Hospital.API.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public int? UserId
    {
        get
        {
            var raw = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? httpContextAccessor.HttpContext?.User?.FindFirstValue("sub");
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    public string? Email => httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email);
    public string? Role => httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);

    public string? IpAddress =>
        httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();

    public string? UserAgent =>
        httpContextAccessor.HttpContext?.Request?.Headers.UserAgent.ToString();

    public bool IsAuthenticated =>
        httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

    public bool IsInRole(params string[] roles)
    {
        var role = Role;
        return role is not null && roles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
    }
}
