using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Hospital.Tests;

public class HospitalWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"HospitalOpdTest_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("UseInMemoryDatabase", "true");
        builder.UseSetting("InMemoryDatabaseName", _dbName);
        builder.UseSetting("Seed:EnableDemoData", "true");
        builder.UseSetting("MigrateOnStartup", "false");
        builder.UseSetting("Jwt:SecretKey", "Integration_Test_Super_Secret_Key_2026_AtLeast32Chars!");
    }
}
