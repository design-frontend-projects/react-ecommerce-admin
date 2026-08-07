param (
    [Parameter(Mandatory=$true)]
    [string]$Command,

    [Parameter(Mandatory=$true)]
    [string]$Env,

    [Parameter(ValueFromRemainingArguments=$true)]
    $AdditionalArgs
)

if ([string]::IsNullOrWhiteSpace($Command) -or [string]::IsNullOrWhiteSpace($Env)) {
    Write-Host "Usage: .\docker-manage.ps1 -Command [up|down|logs|build|restart|scale] -Env [dev|uat|prod] [additional_args...]"
    Write-Host "Example: .\docker-manage.ps1 -Command up -Env dev -d"
    exit 1
}

$ComposeFile = "docker-compose.$Env.yml"

if (-Not (Test-Path -Path $ComposeFile)) {
    Write-Host "Error: Compose file $ComposeFile does not exist." -ForegroundColor Red
    exit 1
}

switch ($Command) {
    "up" { docker compose -f $ComposeFile up $AdditionalArgs }
    "down" { docker compose -f $ComposeFile down $AdditionalArgs }
    "logs" { docker compose -f $ComposeFile logs -f $AdditionalArgs }
    "build" { docker compose -f $ComposeFile build $AdditionalArgs }
    "restart" { docker compose -f $ComposeFile restart $AdditionalArgs }
    "scale" { docker compose -f $ComposeFile up -d --scale $AdditionalArgs }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        exit 1
    }
}
