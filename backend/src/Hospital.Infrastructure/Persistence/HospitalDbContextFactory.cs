using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Hospital.Infrastructure.Persistence;

public class HospitalDbContextFactory : IDesignTimeDbContextFactory<HospitalDbContext>
{
    public HospitalDbContext CreateDbContext(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                   ?? "Server=localhost;Port=3306;Database=sh_hospital_opd;User=root;Password=root;";

        var optionsBuilder = new DbContextOptionsBuilder<HospitalDbContext>();
        optionsBuilder.UseMySQL(conn, b => b.MigrationsAssembly(typeof(HospitalDbContext).Assembly.FullName));
        return new HospitalDbContext(optionsBuilder.Options);
    }
}
