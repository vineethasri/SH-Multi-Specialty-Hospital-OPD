FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Hospital.slnx ./
COPY src/Hospital.Domain/Hospital.Domain.csproj src/Hospital.Domain/
COPY src/Hospital.Application/Hospital.Application.csproj src/Hospital.Application/
COPY src/Hospital.Infrastructure/Hospital.Infrastructure.csproj src/Hospital.Infrastructure/
COPY src/Hospital.API/Hospital.API.csproj src/Hospital.API/
COPY tests/Hospital.Tests/Hospital.Tests.csproj tests/Hospital.Tests/
RUN dotnet restore src/Hospital.API/Hospital.API.csproj

COPY . .
RUN dotnet publish src/Hospital.API/Hospital.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Hospital.API.dll"]
