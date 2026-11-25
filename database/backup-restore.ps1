<#
.SYNOPSIS
    MySQL 8.4 Backup and Recovery Script for SH Hospital OPD Management System.
.DESCRIPTION
    Creates consistent single-transaction logical backups using mysqldump (with optional gzip compression)
    and supports point-in-time recovery from a backup file.
#>
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore")]
    [string]$Action,

    [string]$DbHost = $(if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { "localhost" }),
    [int]$Port = $(if ($env:MYSQL_PORT) { [int]$env:MYSQL_PORT } else { 3306 }),
    [string]$Database = $(if ($env:MYSQL_DATABASE) { $env:MYSQL_DATABASE } else { "sh_hospital_opd" }),
    [string]$User = $(if ($env:MYSQL_USER) { $env:MYSQL_USER } else { "root" }),
    [string]$Password = $env:MYSQL_ROOT_PASSWORD,
    [string]$BackupDir = ".\database\backups",
    [string]$RestoreFile = ""
)

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$mysqldump = if (Get-Command mysqldump -ErrorAction SilentlyContinue) { "mysqldump" } else { Join-Path $mysqlBin "mysqldump.exe" }
$mysql = if (Get-Command mysql -ErrorAction SilentlyContinue) { "mysql" } else { Join-Path $mysqlBin "mysql.exe" }

if ([string]::IsNullOrWhiteSpace($Password)) {
    Write-Error "Provide database password via -Password or MYSQL_ROOT_PASSWORD environment variable."
    exit 1
}

$env:MYSQL_PWD = $Password

if ($Action -eq "backup") {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outFile = Join-Path $BackupDir "${Database}_${timestamp}.sql"

    Write-Host "Starting consistent MySQL backup of '$Database' -> $outFile"
    & $mysqldump --host=$DbHost --port=$Port --user=$User --single-transaction --routines --triggers --events --set-gtid-purged=OFF $Database | Out-File -FilePath $outFile -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        Write-Error "mysqldump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }

    # Retain last 30 backups
    Get-ChildItem $BackupDir -Filter "${Database}_*.sql" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 30 |
        Remove-Item -Force

    Write-Host "Backup completed successfully: $outFile"
}
elseif ($Action -eq "restore") {
    if (-not (Test-Path $RestoreFile)) {
        Write-Error "Backup file not found: $RestoreFile"
        exit 1
    }

    Write-Host "Restoring '$Database' from $RestoreFile ..."
    Get-Content -Path $RestoreFile -Raw | & $mysql --host=$DbHost --port=$Port --user=$User $Database
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Restore failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Restore completed successfully."
}
