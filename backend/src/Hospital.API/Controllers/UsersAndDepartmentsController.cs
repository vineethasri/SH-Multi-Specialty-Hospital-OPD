using Asp.Versioning;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Users;
using Hospital.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hospital.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/users")]
[Authorize(Roles = "Admin")]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<UserDto>>> GetAll([FromQuery] PagedRequest request, [FromQuery] string? role, [FromQuery] bool? isActive, CancellationToken ct)
        => Ok(await userService.GetUsersAsync(request, role, isActive, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken ct)
        => Ok(await userService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var created = await userService.CreateUserAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken ct)
        => Ok(await userService.UpdateUserAsync(id, request, ct));

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetRoles(CancellationToken ct)
        => Ok(await userService.GetRolesAsync(ct));
}

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/departments")]
public class DepartmentsController(IDepartmentService departmentService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DepartmentDto>>> GetAll([FromQuery] bool? isActive, [FromQuery] string? search, CancellationToken ct)
        => Ok(await departmentService.GetAllAsync(isActive, search, ct));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<DepartmentDto>> GetById(int id, CancellationToken ct)
        => Ok(await departmentService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DepartmentDto>> Create([FromBody] SaveDepartmentRequest request, CancellationToken ct)
    {
        var created = await departmentService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id, version = "1" }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DepartmentDto>> Update(int id, [FromBody] SaveDepartmentRequest request, CancellationToken ct)
        => Ok(await departmentService.UpdateAsync(id, request, ct));

    [HttpGet("hospital-settings")]
    [AllowAnonymous]
    public async Task<ActionResult<HospitalSettingDto>> GetHospitalSettings(CancellationToken ct)
        => Ok(await departmentService.GetHospitalSettingsAsync(ct));

    [HttpPut("hospital-settings")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<HospitalSettingDto>> UpdateHospitalSettings([FromBody] UpdateHospitalSettingRequest request, CancellationToken ct)
        => Ok(await departmentService.UpdateHospitalSettingsAsync(request, ct));
}
